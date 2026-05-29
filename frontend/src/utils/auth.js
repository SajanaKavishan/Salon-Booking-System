export function clearAuthStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
}
