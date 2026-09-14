import * as THREE from "three";

const DEG2RAD = Math.PI / 180.0;

export interface DeviceOrientationEuler {
  alpha: number | null; // Z-axis rotation [0, 360]
  beta: number | null; // X-axis rotation [-180, 180]
  gamma: number | null; // Y-axis rotation [-90, 90]
  compassHeading?: number | null; // iOS webkitCompassHeading or Android absolute
}

export interface OrientationTelemetry {
  azimuth: number; // Compass heading (0 to 360 degrees, 0 = North)
  altitude: number; // Pitch above horizon (-90 to +90 degrees)
  roll: number; // Roll angle (-180 to +180 degrees)
}

/**
 * Computes a Three.js Quaternion from mobile deviceorientation sensor readings.
 * Uses Tait-Bryan angles intrinsic Z-X'-Y'' sequence.
 * Aligns the virtual camera ray (+Z backwards, -Z forward) with the rear camera pointing direction.
 */
export function computeCameraQuaternion(
  orientation: DeviceOrientationEuler,
  screenOrientationAngle = 0,
): THREE.Quaternion {
  const alpha = (orientation.alpha ?? 0) * DEG2RAD;
  const beta = (orientation.beta ?? 0) * DEG2RAD;
  const gamma = (orientation.gamma ?? 0) * DEG2RAD;
  const orient = screenOrientationAngle * DEG2RAD;

  // Euler rotation: ZXY intrinsic
  const euler = new THREE.Euler();
  euler.set(beta, alpha, -gamma, "YXZ"); // Three.js coordinate mapping for device sensors

  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90 deg around X to align phone normal with camera ray
  const qScreen = new THREE.Quaternion();

  q0.setFromEuler(euler);

  // Apply camera baseline offset
  q0.multiply(q1);

  // Compensate for screen orientation
  qScreen.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orient);
  q0.multiply(qScreen);

  return q0;
}

/**
 * Extracts current azimuth (compass bearing) and altitude (elevation angle)
 * from the camera orientation quaternion.
 */
export function getCameraLookDirection(
  quaternion: THREE.Quaternion,
): OrientationTelemetry {
  // Forward camera direction in Three.js is (0, 0, -1)
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

  // Altitude is the angle above the X-Z ground plane
  // forward.y is sin(altitude)
  const altitude =
    Math.asin(Math.max(-1, Math.min(1, forward.y))) * (180.0 / Math.PI);

  // Azimuth is the compass bearing on the X-Z plane:
  // -Z is North (Az = 0)
  // +X is East (Az = 90)
  // +Z is South (Az = 180)
  // -X is West (Az = 270)
  let azimuth = Math.atan2(forward.x, -forward.z) * (180.0 / Math.PI);
  if (azimuth < 0) {
    azimuth += 360.0;
  }

  // Roll: calculate tilt around the forward look vector
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
  const roll =
    Math.atan2(right.y, Math.sqrt(right.x * right.x + right.z * right.z)) *
    (180.0 / Math.PI);

  return {
    azimuth: (azimuth + 360.0) % 360.0,
    altitude,
    roll,
  };
}
