import { demoUsers, allUsers } from '../../data/mockData';
import { normalizeRole } from '../../data/roles';

export const authApi = {
  async login(username, password) {
    const user = allUsers.find(u => u.username === username || u.id === username || u.email === username);
    if (!user) {
      throw new Error('Incorrect username or password');
    }
    return user;
  },

  async logout() {
    return { success: true };
  },

  async getCurrentUser() {
    return demoUsers[0];
  },

  async getDemoUsers() {
    return demoUsers;
  }
};

export default authApi;
