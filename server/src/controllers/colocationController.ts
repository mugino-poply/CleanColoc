import type { Request, Response, NextFunction } from 'express';
import Colocation from '../models/Colocation';
import Membership from '../models/Membership';
import TaskAssignment from '../models/TaskAssignment';
import { randomBytes } from 'crypto';
import User from '../models/user';
import sequelize from '../config/database';

const generateInviteCode = (): string => {
  return randomBytes(4).toString('hex').toUpperCase();
};

const generateUniqueInviteCode = async (maxAttempts = 5): Promise<string> => {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateInviteCode();
    const exists = await Colocation.findOne({ where: { inviteCode: code }, paranoid: false });
    if (!exists) return code;
  }
  throw new Error("Impossible de générer un code d'invitation unique après 5 tentatives.");
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

    const existingMembership = await Membership.findOne({
      where: { userId },
      paranoid: false,
    });

    if (existingMembership && !existingMembership.deletedAt) {
      res.status(409).json({ message: 'Vous appartenez déjà à une colocation.' });
      return;
    }

    const inviteCode = await generateUniqueInviteCode();

    const colocation = await Colocation.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      inviteCode,
    });

    if (existingMembership?.deletedAt) {
      await existingMembership.restore();
      await existingMembership.update({ colocationId: colocation.id, role: 'admin' });
    } else {
      await Membership.create({
        userId,
        colocationId: colocation.id,
        role: 'admin',
      });
    }

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

    const existingMembership = await Membership.findOne({
      where: { userId },
      paranoid: false,
    });

    if (existingMembership && !existingMembership.deletedAt) {
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

    if (existingMembership?.deletedAt) {
      await existingMembership.restore();
      await existingMembership.update({ colocationId: colocation.id, role: 'member' });
    } else {
      await Membership.create({
        userId,
        colocationId: colocation.id,
        role: 'member',
      });
    }

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
      include: [{
        model: Colocation,
        as: 'colocation',
        attributes: ['id', 'name', 'description', 'inviteCode', 'autoRotation', 'createdAt'],
      }],
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

export const getColocationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const id = req.params['id'] as string;

    if (!userId) {
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    const membership = await Membership.findOne({ where: { userId, colocationId: id } });
    if (!membership) {
      res.status(403).json({ message: 'Accès interdit.' });
      return;
    }

    const colocation = await Colocation.findByPk(id, {
      attributes: ['id', 'name', 'description', 'inviteCode', 'createdAt'],
    });

    if (!colocation) {
      res.status(404).json({ message: 'Colocation introuvable.' });
      return;
    }

    res.status(200).json(colocation);
  } catch (error) {
    next(error);
  }
};

export const getColocationMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = req.params.id;

    const memberships = await Membership.findAll({
      where: { colocationId },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'avatarUrl'],
        },
      ],
    });

    const members = memberships
      .map((m) => ({
        membershipId: m.id,
        userId: (m as any).User.id,
        username: (m as any).User.username,
        avatarUrl: (m as any).User.avatarUrl ?? null,
        role: m.role,
        joinedAt: m.createdAt,
      }))
      .sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.username.localeCompare(b.username);
      });

    res.status(200).json(members);
  } catch (error) {
    next(error);
  }
};

export const updateColocationSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { autoRotation } = req.body;

    if (typeof autoRotation !== 'boolean') {
      res.status(400).json({ message: 'autoRotation doit être un booléen.' });
      return;
    }

    const colocation = await Colocation.findByPk(id);
    if (!colocation) {
      res.status(404).json({ message: 'Colocation introuvable.' });
      return;
    }

    await colocation.update({ autoRotation });

    res.status(200).json({ autoRotation: colocation.autoRotation });
  } catch (error) {
    next(error);
  }
};

export const transferAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const colocationId = req.params.id;
    const requesterId = req.user?.id;
    const { toUserId } = req.body;

    if (!toUserId) {
      res.status(400).json({ error: 'Le champ toUserId est requis.' });
      return;
    }

    if (toUserId === requesterId) {
      res.status(400).json({ error: 'Vous êtes déjà administrateur.' });
      return;
    }

    const targetMembership = await Membership.findOne({
      where: { userId: toUserId, colocationId },
    });

    if (!targetMembership) {
      res.status(400).json({ error: "L'utilisateur ciblé n'est pas membre de cette colocation." });
      return;
    }

    if (targetMembership.role === 'admin') {
      res.status(400).json({ error: 'Cet utilisateur est déjà administrateur.' });
      return;
    }

    const requesterMembership = await Membership.findOne({
      where: { userId: requesterId, colocationId },
    });

    await sequelize.transaction(async (t) => {
      await requesterMembership!.update({ role: 'member' }, { transaction: t });
      await targetMembership.update({ role: 'admin' }, { transaction: t });
    });

    // notify(toUserId, 'Vous êtes maintenant administrateur de la colocation.');

    res.status(200).json({
      membership: {
        userId: toUserId,
        role: 'admin',
        colocationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateColocationInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description } = req.body;

    if (name === undefined && description === undefined) {
      res.status(400).json({ message: 'Au moins un champ doit être présent : name ou description.' });
      return;
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ message: "Le nom ne peut pas être vide ou composé uniquement d'espaces." });
      return;
    }

    const colocation = await Colocation.findByPk(id);
    if (!colocation) {
      res.status(404).json({ message: 'Colocation introuvable.' });
      return;
    }

    const updates: Partial<{ name: string; description: string }> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;

    await colocation.update(updates);

    res.status(200).json({
      colocation: {
        id: colocation.id,
        name: colocation.name,
        description: colocation.description,
        inviteCode: colocation.inviteCode,
        autoRotation: colocation.autoRotation,
        updatedAt: colocation.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const regenerateInviteCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const colocation = await Colocation.findByPk(id);
    if (!colocation) {
      res.status(404).json({ message: 'Colocation introuvable.' });
      return;
    }

    const newCode = await generateUniqueInviteCode();
    await colocation.update({ inviteCode: newCode });

    res.status(200).json({ inviteCode: newCode });
  } catch (error) {
    next(error);
  }
};
export const leaveColocation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const colocationId = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      await t.rollback();
      res.status(401).json({ message: 'Non authentifié.' });
      return;
    }

    const membership = await Membership.findOne({
      where: { userId, colocationId },
      transaction: t,
    });

    if (!membership) {
      await t.rollback();
      res.status(404).json({ message: "Vous n'êtes pas membre de cette colocation." });
      return;
    }

    const allMembers = await Membership.findAll({
      where: { colocationId },
      transaction: t,
    });

    // Si admin et d'autres membres restent → erreur
    if (membership.role === 'admin' && allMembers.length > 1) {
      await t.rollback();
      res.status(400).json({ message: "Transférez l'admin avant de quitter." });
      return;
    }

    // Si dernier membre → supprimer la colocation
    if (allMembers.length === 1) {
      const colocation = await Colocation.findByPk(colocationId, { transaction: t });
      await membership.destroy({ transaction: t });
      await colocation?.destroy({ transaction: t });
    } else {
      await membership.destroy({ transaction: t });
    }

    await t.commit();
    res.status(204).send();
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const userId = req.params.userId as string;

  if (!UUID_REGEX.test(userId)) {
    res.status(400).json({ error: 'userId invalide (format UUID attendu).' });
    return;
  }

  const t = await sequelize.transaction();
  try {
    const colocationId = req.params.id as string;
    const requesterId = req.user?.id;

    if (userId === requesterId) {
      await t.rollback();
      res.status(400).json({
        message: "Vous ne pouvez pas vous retirer vous-même. Utilisez la fonctionnalité de quitter la colocation.",
      });
      return;
    }

    const membership = await Membership.findOne({
      where: { userId, colocationId },
      transaction: t,
    });

    if (!membership) {
      await t.rollback();
      res.status(404).json({ message: "Ce membre n'est pas dans cette colocation." });
      return;
    }

    await membership.destroy({ transaction: t });

    await TaskAssignment.destroy({
      where: { userId, colocationId, status: 'à faire' },
      transaction: t,
    });

    await t.commit();
    res.status(200).json({ message: 'Membre retiré de la colocation.' });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};