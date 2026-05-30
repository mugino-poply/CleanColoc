import { createTaskInColocation, updateTask, deleteTask } from '../controllers/taskController';
import Task from '../models/Task';
import TaskAssignment from '../models/TaskAssignment';

jest.mock('../models/Task', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../models/TaskAssignment', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildReq = (overrides: Record<string, any> = {}): any => ({
  body: {},
  params: {},
  query: {},
  user: { id: 'user-uuid-1' },
  colocationId: 'coloc-uuid-1',
  ...overrides,
});

const buildRes = (): any => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  r.send   = jest.fn().mockReturnValue(r);
  return r;
};

const buildNext = (): jest.Mock => jest.fn();

// ─── createTaskInColocation ───────────────────────────────────────────────────

describe('createTaskInColocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne 400 si title est absent', async () => {
    const r = buildRes();
    await createTaskInColocation(buildReq({ body: {} }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('title') })
    );
  });

  it('retourne 400 si title est une chaîne vide', async () => {
    const r = buildRes();
    await createTaskInColocation(buildReq({ body: { title: '   ' } }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('retourne 400 si tâche récurrente sans recurringInterval', async () => {
    const r = buildRes();
    await createTaskInColocation(
      buildReq({ body: { title: 'Nettoyer', isRecurring: true } }),
      r,
      buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('recurringInterval') })
    );
  });

  it('retourne 400 si tâche ponctuelle avec recurringInterval', async () => {
    const r = buildRes();
    await createTaskInColocation(
      buildReq({ body: { title: 'Nettoyer', isRecurring: false, recurringInterval: 'weekly' } }),
      r,
      buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('retourne 400 si dueDate est invalide', async () => {
    const r = buildRes();
    await createTaskInColocation(
      buildReq({ body: { title: 'Nettoyer', dueDate: 'pas-une-date' } }),
      r,
      buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('dueDate') })
    );
  });

  it('retourne 400 si dueDate est dans le passé', async () => {
    const r = buildRes();
    await createTaskInColocation(
      buildReq({ body: { title: 'Nettoyer', dueDate: '2000-01-01T00:00:00Z' } }),
      r,
      buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('futur') })
    );
  });

  it('crée une tâche récurrente et retourne 201 sans assignment', async () => {
    const mockTask = { id: 'task-1', title: "Passer l'aspirateur", weight: 1 };
    (Task.create as jest.Mock).mockResolvedValue(mockTask);

    const futureDate = new Date(Date.now() + 86_400_000 * 7).toISOString();
    const r = buildRes();
    await createTaskInColocation(
      buildReq({ body: { title: "Passer l'aspirateur", isRecurring: true, recurringInterval: 'weekly', dueDate: futureDate } }),
      r,
      buildNext()
    );

    expect(Task.create).toHaveBeenCalledTimes(1);
    expect(TaskAssignment.create).not.toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith({ task: mockTask });
  });

  it('crée une tâche ponctuelle et retourne 201 avec assignment', async () => {
    const mockTask       = { id: 'task-2', title: 'Sortir les poubelles', weight: 1 };
    const mockAssignment = { id: 'assign-1', taskId: 'task-2', status: 'à faire' };
    (Task.create as jest.Mock).mockResolvedValue(mockTask);
    (TaskAssignment.create as jest.Mock).mockResolvedValue(mockAssignment);

    const futureDate = new Date(Date.now() + 86_400_000 * 3).toISOString();
    const r = buildRes();
    await createTaskInColocation(
      buildReq({ body: { title: 'Sortir les poubelles', isRecurring: false, dueDate: futureDate } }),
      r,
      buildNext()
    );

    expect(Task.create).toHaveBeenCalledTimes(1);
    expect(TaskAssignment.create).toHaveBeenCalledTimes(1);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith({ task: mockTask, assignment: mockAssignment });
  });

  it('propage l\'erreur via next() en cas d\'échec DB', async () => {
    const dbError = new Error('DB failure');
    (Task.create as jest.Mock).mockRejectedValue(dbError);

    const n = buildNext();
    await createTaskInColocation(
      buildReq({ body: { title: 'Test', isRecurring: true, recurringInterval: 'daily' } }),
      buildRes(),
      n
    );
    expect(n).toHaveBeenCalledWith(dbError);
  });
});

// ─── updateTask ───────────────────────────────────────────────────────────────

describe('updateTask', () => {
  const mockTaskInstance = () => ({
    id: 'task-1',
    title: 'Ancienne tâche',
    update: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => jest.clearAllMocks());

  it('retourne 400 si aucun champ n\'est fourni', async () => {
    const r = buildRes();
    await updateTask(buildReq({ body: {}, task: mockTaskInstance() }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Aucun champ') })
    );
  });

  it('retourne 400 si title est une chaîne vide', async () => {
    const r = buildRes();
    await updateTask(buildReq({ body: { title: '' }, task: mockTaskInstance() }), r, buildNext());
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('retourne 400 si dueDate est invalide', async () => {
    const r = buildRes();
    await updateTask(
      buildReq({ body: { dueDate: 'not-a-date' }, task: mockTaskInstance() }),
      r,
      buildNext()
    );
    expect(r.status).toHaveBeenCalledWith(400);
  });

  it('met à jour le titre et retourne 200', async () => {
    const task        = mockTaskInstance();
    const updatedTask = { id: 'task-1', title: 'Nouveau titre' };
    (Task.findByPk as jest.Mock).mockResolvedValue(updatedTask);

    const r = buildRes();
    await updateTask(buildReq({ body: { title: 'Nouveau titre' }, task }), r, buildNext());

    expect(task.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Nouveau titre' })
    );
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(updatedTask);
  });

  it('accepte dueDate null pour effacer la date et retourne 200', async () => {
    const task        = mockTaskInstance();
    const updatedTask = { id: 'task-1', dueDate: null };
    (Task.findByPk as jest.Mock).mockResolvedValue(updatedTask);

    const r = buildRes();
    await updateTask(buildReq({ body: { dueDate: null }, task }), r, buildNext());

    expect(task.update).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: null })
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

// ─── deleteTask ───────────────────────────────────────────────────────────────

describe('deleteTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('soft-delete la tâche et toutes ses assignations, retourne 204', async () => {
    const task = { id: 'task-1', destroy: jest.fn().mockResolvedValue(undefined) };
    (TaskAssignment.destroy as jest.Mock).mockResolvedValue(2);

    const r = buildRes();
    await deleteTask(buildReq({ task }), r, buildNext());

    expect(TaskAssignment.destroy).toHaveBeenCalledWith({ where: { taskId: 'task-1' } });
    expect(task.destroy).toHaveBeenCalledTimes(1);
    expect(r.status).toHaveBeenCalledWith(204);
    expect(r.send).toHaveBeenCalled();
  });
});