import { Router } from 'express';
import { createAppointment, updateStatus, getAppointments } from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['ADMIN']), createAppointment);
router.patch('/:id/status', updateStatus);
router.get('/', getAppointments);

export default router;
