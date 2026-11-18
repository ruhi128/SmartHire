import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Profile from './Profile';
import { studentAPI } from '../../api/axios';
import toast from 'react-hot-toast';

jest.mock('../../api/axios', () => ({
  authAPI: { getAvatar: jest.fn(), uploadAvatar: jest.fn(), removeAvatar: jest.fn() },
  studentAPI: { getProfile: jest.fn(), updateProfile: jest.fn() },
}));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1', name: 'Aria', email: 'aria@example.com' }, updateUserLocally: jest.fn() }),
}));
jest.mock('../../components/GlowCard', () => ({
  __esModule: true,
  default: ({ title, children }) => <section><h2>{title}</h2>{children}</section>,
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const storedProfile = {
  full_name: 'Aria', email: 'aria@example.com', branch: 'IT', roll_number: '21IT104',
  cgpa: 0, tenth_percent: 0, twelfth_percent: 0, backlogs: 0,
  linkedin_url: 'https://linkedin.com/in/aria', github_url: 'https://github.com/aria',
  placement_status: 'placed', skills: [], certifications: [], avatar_url: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  studentAPI.getProfile.mockResolvedValue({ data: { profile: storedProfile } });
  studentAPI.updateProfile.mockResolvedValue({ data: { profile: storedProfile } });
});
afterEach(() => jest.restoreAllMocks());

test('loads existing links and saves numeric zero without editing placement-owned fields', async () => {
  render(<Profile />);
  await screen.findByText('My Profile');
  fireEvent.click(screen.getByText('Edit Profile'));
  fireEvent.click(screen.getByText(/Contact/));
  expect(screen.getByPlaceholderText('https://linkedin.com/in/yourname').value).toBe(storedProfile.linkedin_url);
  expect(screen.getByPlaceholderText('https://github.com/yourname').value).toBe(storedProfile.github_url);
  fireEvent.click(screen.getByText('Save Changes'));
  await waitFor(() => expect(studentAPI.updateProfile).toHaveBeenCalledTimes(1));
  const payload = studentAPI.updateProfile.mock.calls[0][0];
  expect(payload).toMatchObject({ cgpa: 0, tenth_percent: 0, twelfth_percent: 0,
    linkedin_url: storedProfile.linkedin_url, github_url: storedProfile.github_url });
  expect(payload).not.toHaveProperty('roll_number');
  expect(payload).not.toHaveProperty('placement_status');
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});

test('does not claim success when the server omits the saved profile', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  studentAPI.updateProfile.mockResolvedValue({ data: { message: 'ok' } });
  render(<Profile />);
  await screen.findByText('My Profile');
  fireEvent.click(screen.getByText('Edit Profile'));
  fireEvent.click(screen.getByText('Save Changes'));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('did not confirm')));
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.getByText('Save Changes')).toBeTruthy();
});
