import api from './client.js';

export const getCourses = () => api.get('/courses').then((r) => r.data);
export const getMyEnrollments = () => api.get('/courses/mine').then((r) => r.data);
export const enrollCourse = (id) => api.post(`/courses/${id}/enroll`).then((r) => r.data);
export const cancelEnrollment = (id) => api.patch(`/courses/${id}/cancel`).then((r) => r.data);
