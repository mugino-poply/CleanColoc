import type { Request, Response, NextFunction } from 'express';
import Task from '../models/Task';

export const getAllTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { colocationId } = req.query;
    const tasks = await Task.findAll({
      where: colocationId ? { colocationId: String(colocationId) } : {},
      attributes: ['id', 'title', 'description', 'status', 'assignedTo', 'colocationId', 'isRecurring', 'recurringInterval', 'dueDate', 'createdAt', 'updatedAt'],
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const task = await Task.findByPk(id, {
      attributes: ['id', 'title', 'description', 'status', 'assignedTo', 'colocationId', 'isRecurring', 'recurringInterval', 'dueDate', 'createdAt', 'updatedAt'],
    });
    if (!task) {
      res.status(404).json({ message: 'Tâche introuvable.' });
      return;
    }
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, colocationId, assignedTo, isRecurring, recurringInterval, dueDate } = req.body;
    if (!title || !colocationId) {
      res.status(400).json({ message: 'Les champs title et colocationId sont obligatoires.' });
      return;
    }
    const task = await Task.create({
      title,
      description,
      colocationId,
      assignedTo,
      isRecurring: isRecurring ?? false,
      recurringInterval,
      dueDate,
      status: 'pending',
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const task = await Task.findByPk(id);
    if (!task) {
      res.status(404).json({ message: 'Tâche introuvable.' });
      return;
    }
    await task.update(req.body);
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const assignTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const task = await Task.findByPk(id);
    if (!task) {
      res.status(404).json({ message: 'Tâche introuvable.' });
      return;
    }
    const { assignedTo } = req.body;
    if (assignedTo === undefined) {
      res.status(400).json({ message: 'Le champ assignedTo est obligatoire.' });
      return;
    }
    await task.update({ assignedTo });
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const completeTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const task = await Task.findByPk(id);
    if (!task) {
      res.status(404).json({ message: 'Tâche introuvable.' });
      return;
    }
    await task.update({ status: 'done' });
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const task = await Task.findByPk(id);
    if (!task) {
      res.status(404).json({ message: 'Tâche introuvable.' });
      return;
    }
    await task.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};