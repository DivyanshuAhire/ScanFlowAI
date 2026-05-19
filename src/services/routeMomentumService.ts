import { spatialGraphService } from './spatialGraphService';

export class RouteMomentumService {
  /**
   * Determine the momentum direction based on previous movement.
   * Return negative for forward momentum, positive for reverse (penalty).
   */
  calculateMomentumScore(
    previousDistanceToHQ: number | null,
    currentDistanceToHQ: number,
    nextDistanceToHQ: number
  ): number {
    if (previousDistanceToHQ === null) {
        return 0; // No previous momentum to judge
    }

    const previousDirection = currentDistanceToHQ - previousDistanceToHQ; 
    const nextDirection = nextDistanceToHQ - currentDistanceToHQ;

    if (previousDirection > 0 && nextDirection > 0) {
      // Continuing outward
      return -40; // Forward Momentum bonus
    } else if (previousDirection < 0 && nextDirection < 0) {
      // Continuing inward (returning to HQ)
      return -40; // Forward Momentum bonus in the inward direction
    } else if (previousDirection > 0 && nextDirection < 0) {
      // Reversing direction inward
      return 50; // Reverse direction penalty
    } else if (previousDirection < 0 && nextDirection > 0) {
      // Reversing direction outward
      return 50; // Reverse direction penalty
    }

    return 0;
  }
}

export const routeMomentumService = new RouteMomentumService();
