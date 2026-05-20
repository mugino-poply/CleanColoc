import type { Request, Response, NextFunction } from 'express';
import Colocation from '../models/Colocation';
import Membership from '../models/Membership';
import { randomBytes } from 'crypto';

const generateInviteCode = (): string => {
  return randomBytes(4).toString('hex').toUpperCase();
};

export const createColocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ message: 'Le nom de la colocation est requis.' });
      return;
    }
    
    const existingMembership = await Membership.findOne({ where: { userId } });
    if (existingMembership) {
    res.status(409).json({ message: 'Vous appartenez déjà à une colocation.' });
    return;
    }

    let inviteCode = generateInviteCode();
    let codeExists = await Colocation.findOne({ where: { inviteCode } });
    while (codeExists) {
      inviteCode = generateInviteCode();
      codeExists = await Colocation.findOne({ where: { inviteCode } });
    }

    const colocation = await Colocation.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      inviteCode,
    });

    await Membership.create({
      userId,
      colocationId: colocation.id,
      role: 'admin',
    });

    res.status(201).json(colocation);
  } catch (error) {
    next(error);
  }
};

export const joinColocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.trim() === '') {
      res.status(400).json({ message: "Le code d'invitation est requis." });
      return;
    }

    const existingMembership = await Membership.findOne({ where: { userId } });
    if (existingMembership) {
      res.status(409).json({ message: 'Vous appartenez déjà à une colocation.' });
      return;
    }

    const colocation = await Colocation.findOne({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!colocation) {
      res.status(404).json({ message: "Code d'invitation invalide." });
      return;
    }

    await Membership.create({
      userId,
      colocationId: colocation.id,
      role: 'member',
    });

    res.status(200).json(colocation);
  } catch (error) {
    next(error);
  }
};

export const getMyColocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const membership = await Membership.findOne({
      where: { userId },
      include: [{ model: Colocation, as: 'colocation' }],
    });

    if (!membership) {
      res.status(404).json({ error: 'No colocation found for this user' });
      return;
    }

    res.status(200).json({
      colocation: (membership as any).colocation,
      role: membership.role,
    });
  } catch (error) {
    next(error);
  }
};