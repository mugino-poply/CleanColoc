import { UserService } from '../services/userService';
import User from '../models/user';

jest.mock('../models/user', () => ({
  __esModule: true,
  default: {
    findOne:  jest.fn(),
    create:   jest.fn(),
    findByPk: jest.fn(),
  },
}));

const buildUser = (overrides: Record<string, any> = {}) => ({
  id:              'user-1',
  username:        'Alice',
  email:           'alice@test.com',
  password:        'hashed-password',
  avatarUrl:       null,
  comparePassword: jest.fn(),
  toJSON: jest.fn().mockReturnValue({
    id: 'user-1', username: 'Alice', email: 'alice@test.com',
    password: 'hashed-password', avatarUrl: null,
  }),
  save:    jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ─── registerUser ─────────────────────────────────────────────────────────────

describe('UserService.registerUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it("lève une erreur 400 si l'email est déjà utilisé", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(buildUser());
    await expect(
      UserService.registerUser({ username: 'Bob', email: 'alice@test.com', password: 'pw' })
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('email') });
  });

  it("crée l'utilisateur et retourne les données sans le mot de passe", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    const mockUser = buildUser();
    (User.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await UserService.registerUser({
      username: 'Alice', email: 'alice@test.com', password: 'secret',
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@test.com', username: 'Alice' })
    );
    expect(result).not.toHaveProperty('password');
    expect(result).toHaveProperty('username', 'Alice');
  });

  it("ne propage pas avatarUrl si absent", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockResolvedValue(buildUser());

    await UserService.registerUser({ username: 'Alice', email: 'alice@test.com', password: 'pw' });

    const callArgs = (User.create as jest.Mock).mock.calls[0]?.[0];
    expect(callArgs.avatarUrl).toBeUndefined();
  });
});

// ─── getUserById ──────────────────────────────────────────────────────────────

describe('UserService.getUserById', () => {
  beforeEach(() => jest.clearAllMocks());

  it("lève une erreur 404 si l'utilisateur est introuvable", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(null);
    await expect(UserService.getUserById('ghost')).rejects.toMatchObject({ status: 404 });
  });

  it("retourne l'utilisateur si trouvé", async () => {
    const mockUser = buildUser();
    (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
    const result = await UserService.getUserById('user-1');
    expect(result).toBe(mockUser);
  });
});

// ─── updateUser ───────────────────────────────────────────────────────────────

describe('UserService.updateUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it("lève une erreur 404 si l'utilisateur est introuvable", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(null);
    await expect(
      UserService.updateUser('ghost', { username: 'Test' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("met à jour username et avatarUrl, retourne sans mot de passe", async () => {
    const mockUser = buildUser();
    mockUser.toJSON.mockReturnValue({
      id: 'user-1', username: 'Nouveau', email: 'alice@test.com',
      password: 'hashed', avatarUrl: 'url',
    });
    (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

    const result = await UserService.updateUser('user-1', { username: 'Nouveau', avatarUrl: 'url' });

    expect(mockUser.save).toHaveBeenCalledTimes(1);
    expect(result).not.toHaveProperty('password');
    expect(result).toHaveProperty('username', 'Nouveau');
  });

  it("ne modifie que les champs fournis", async () => {
    const mockUser = buildUser();
    mockUser.toJSON.mockReturnValue({
      id: 'user-1', username: 'Alice', email: 'a@test.com', avatarUrl: 'new-url',
    });
    (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

    await UserService.updateUser('user-1', { avatarUrl: 'new-url' });

    expect(mockUser.username).toBe('Alice');   // username inchangé
    expect(mockUser.avatarUrl).toBe('new-url');
  });
});

// ─── deleteUser ───────────────────────────────────────────────────────────────

describe('UserService.deleteUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it("lève une erreur 404 si l'utilisateur est introuvable", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue(null);
    await expect(UserService.deleteUser('ghost', 'pw')).rejects.toMatchObject({ status: 404 });
  });

  it("lève une erreur 401 si le mot de passe est incorrect", async () => {
    const mockUser = buildUser();
    mockUser.comparePassword.mockResolvedValue(false);
    (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

    await expect(UserService.deleteUser('user-1', 'wrong')).rejects.toMatchObject({ status: 401 });
    expect(mockUser.destroy).not.toHaveBeenCalled();
  });

  it("supprime l'utilisateur si le mot de passe est correct", async () => {
    const mockUser = buildUser();
    mockUser.comparePassword.mockResolvedValue(true);
    (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

    await UserService.deleteUser('user-1', 'correct');
    expect(mockUser.destroy).toHaveBeenCalledTimes(1);
  });
});