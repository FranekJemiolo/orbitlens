# OrbitLens System Design & Mathematical Architecture

OrbitLens is a Progressive Web Application (PWA) that superimposes celestial bodies (stars, constellations, planets/comets) and orbital satellites (ISS, Starlink) onto the physical night sky captured through a mobile device's camera.

---

## 1. Celestial Coordinate Systems & Astronomy Math

### 1.1 Equatorial vs. Horizontal Coordinates
Celestial objects are cataloged in the **Equatorial Coordinate System**:
- **Right Ascension ($\alpha$ or RA)**: Measured in hours ($0^{\text{h}}$ to $24^{\text{h}}$) or radians ($0$ to $2\pi$).
- **Declination ($\delta$ or Dec)**: Measured in degrees ($-90^\circ$ to $+90^\circ$) or radians ($-\frac{\pi}{2}$ to $+\frac{\pi}{2}$).

An observer on Earth views the sky in the **Horizontal (Alt/Az) Coordinate System**:
- **Altitude ($a$ or Alt)**: Angle above the local horizon ($-90^\circ$ Nadir, $0^\circ$ Horizon, $+90^\circ$ Zenith).
- **Azimuth ($A$ or Az)**: Compass heading ($0^\circ$ True North, $90^\circ$ East, $180^\circ$ South, $270^\circ$ West).

### 1.2 Greenwich Mean Sidereal Time (GMST) & Local Sidereal Time (LMST)
To bridge Equatorial and Horizontal coordinates at a specific UTC timestamp $t$ and observer longitude $\lambda_{\text{obs}}$:

1. Calculate Julian Date ($JD$) and centuries since J2000.0 ($T$):
$$JD = \text{DateToJulianDate}(t)$$
$$T = \frac{JD - 2451545.0}{36525.0}$$

2. Greenwich Mean Sidereal Time in degrees ($GMST^\circ$):
$$GMST = 280.46061837 + 360.98564736629 \cdot (JD - 2451545.0) + 0.000387933 \cdot T^2 - \frac{T^3}{38710000.0}$$
$$\theta_{\text{GMST}} = GMST \pmod{360^\circ}$$

3. Local Sidereal Time ($LMST$):
$$\theta_{\text{LMST}} = (\theta_{\text{GMST}} + \lambda_{\text{obs}}) \pmod{360^\circ}$$

4. Local Hour Angle ($H$ or $LHA$):
$$H = \theta_{\text{LMST}} - \alpha_{\text{star}}$$

### 1.3 Horizontal Conversion
Given observer latitude $\phi$:

$$\sin(a) = \sin(\phi)\sin(\delta) + \cos(\phi)\cos(\delta)\cos(H)$$
$$a = \arcsin(\sin(a))$$

$$\cos(A) = \frac{\sin(\delta) - \sin(\phi)\sin(a)}{\cos(\phi)\cos(a)}$$
$$\sin(A) = -\frac{\cos(\delta)\sin(H)}{\cos(a)}$$
$$A = \text{atan2}(-\cos(\delta)\sin(H), \sin(\delta) - \sin(\phi)\sin(a)) \pmod{360^\circ}$$

---

## 2. Spherical to 3D Cartesian Coordinates

In Three.js, we define a right-handed coordinate frame for the celestial unit sphere ($r = 1000$ units):
- $+Y$ points to Local Zenith (Altitude $+90^\circ$)
- $-Z$ points to True North (Azimuth $0^\circ$, Altitude $0^\circ$)
- $+X$ points to True East (Azimuth $90^\circ$, Altitude $0^\circ$)

Given Altitude $a$ and Azimuth $A$:
$$X = r \cdot \cos(a) \cdot \sin(A)$$
$$Y = r \cdot \sin(a)$$
$$Z = -r \cdot \cos(a) \cdot \cos(A)$$

This aligns celestial objects directly with geographic compass bearings.

---

## 3. Sensor Fusion & Virtual Camera Orientation

Mobile devices provide attitude data through the `deviceorientation` event:
- $\alpha$: Z-axis rotation (compass heading, $0^\circ \dots 360^\circ$)
- $\beta$: X-axis rotation (pitch/tilt, $-180^\circ \dots 180^\circ$)
- $\gamma$: Y-axis rotation (roll/bank, $-90^\circ \dots 90^\circ$)
- `webkitCompassHeading`: Native iOS magnetometer reading.

### Device-to-World Transform
1. Convert Euler angles $(\alpha, \beta, \gamma)$ into a device rotation quaternion $Q_{\text{device}}$ using intrinsic Z-X'-Y'' Tait-Bryan rotations.
2. Apply camera sensor offset (-90° pitch around X) so the camera ray points along the device's rear camera normal.
3. Compensate for screen orientation angle (`window.orientation` or `screen.orientation.angle`).
4. Apply the resultant quaternion directly to the Three.js `PerspectiveCamera`.

---

## 4. Orbital Mechanics (SGP4 / TLE Propagation)

Satellite orbits are propagated using standard Simplified General Perturbations-4 (SGP4):
1. Ingest Two-Line Element (TLE) sets from CelesTrak.
2. Initialize `satrec` structure via `satellite.twoline2satrec`.
3. Propagate to instantaneous UTC timestamp $t$ to compute Earth-Centered Inertial (ECI) position and velocity vectors.
4. Transform ECI $\rightarrow$ Earth-Centered, Earth-Fixed (ECEF) via Greenwich hour angle.
5. Compute observer look angles (Elevation / Altitude, Azimuth, and Range) using topocentric horizon coordinates.

---

## 5. Aircraft Vectoring (ADS-B)

1. Query OpenSky Network with an observer bounding box:
$$\Delta\text{lat} = \pm \frac{\text{Radius}}{111.32\text{ km}}$$
$$\Delta\text{lon} = \pm \frac{\text{Radius}}{111.32\text{ km} \cdot \cos(\phi)}$$
2. Ingest aircraft state vectors: Latitude, Longitude, Barometric Altitude ($h_{\text{ac}}$).
3. Compute great-circle distance $d$ and initial bearing $A$ from observer to aircraft.
4. Approximate slant altitude angle:
$$a = \arctan2\left(h_{\text{ac}} - h_{\text{obs}}, d\right)$$

---

## 6. Binary Star Catalog Format (16-Byte Stride)

To achieve instantaneous load times and zero garbage-collection stutter, the HYG star catalog is compiled into a flat binary array:

| Byte Offset | Field | Type | Description |
|:---|:---|:---|:---|
| 0 .. 3 | `id` | `int32` | HYG Catalog identifier |
| 4 .. 7 | `ra` | `float32` | Right Ascension (radians, J2000) |
| 8 .. 11 | `dec` | `float32` | Declination (radians, J2000) |
| 12 .. 15 | `mag` | `float32` | Apparent Visual Magnitude ($V$) |

Total stride: **16 bytes per star**. For 5,000 naked-eye stars, the total buffer size is exactly **80,000 bytes** (80 KB), capable of downloading and instantiating into WebGL `Float32Array` attributes in < 5ms.
