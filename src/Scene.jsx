import { FlyControls, Html, Splat } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Vector3, Euler, Quaternion, ArrowHelper } from "three";
import PIPCameraControls from "./playerComponents/PIPCameraControls";
import TouchPIPControls from "./playerComponents/TouchPIPControls";

function Scene() {
  const { streamid } = useParams();

  // pip algorithm
  const [centroid, setCentroid] = useState({ x: 0, y: 0 });
  const [inclination, setInclination] = useState(new Euler());
  const [fly, setFly] = useState(false);
  const boxRef = useRef();
  const splatRef = useRef();

  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [p3, setP3] = useState(null);
  const [boundaryScale, setBoundaryScale] = useState(1);
  const [deviceType, setDeviceType] = useState('desktop');
  const [screenHeight, setScreenHeight] = useState('100vh');
  const [cameraFocalLength, setCameraFocalLength] = useState(100);

  // read a json file
  const [boundaryData, setBoundaryData] = useState(null);
  useEffect(() => {
    fetch("boundary.json")
      .then((response) => response.json())
      .then((data) =>
        setBoundaryData(data.vertices.map(([x, z, y]) => ({ x, y, z })))
      );
  }, []);

  useEffect(() => {
    const detectDeviceType = () => {
      const userAgent = navigator.userAgent;
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        setDeviceType('mobile');
        setScreenHeight('85vh')
      } else {
        setDeviceType('desktop');
        setScreenHeight('100vh')
      }
    };
    detectDeviceType();
    // Add event listener for orientation change, if needed
    window.addEventListener('orientationchange', detectDeviceType);
    return () => {
      window.removeEventListener('orientationchange', detectDeviceType);
    };
  }, []);

  useEffect(() => {
    if (boundaryData) {
      // Calculate centroid
      const total = boundaryData.reduce(
        (acc, vertex) => {
          acc.x += vertex.x;
          acc.y += vertex.y;
          acc.z += vertex.z;
          return acc;
        },
        { x: 0, y: 0, z: 0 }
      );
      const centroid = {
        x: total.x / boundaryData.length,
        y: total.z / boundaryData.length,
        z: total.y / boundaryData.length,
      };
      setCentroid(centroid);
      // Calculate normal vector using first three points
      const p1 = new Vector3(
        boundaryData[0].x * boundaryScale,
        boundaryData[0].z * boundaryScale,
        boundaryData[0].y * boundaryScale
      );
      const p2 = new Vector3(
        boundaryData[1].x * boundaryScale,
        boundaryData[1].z * boundaryScale,
        boundaryData[1].y * boundaryScale
      );
      const p3 = new Vector3(
        boundaryData[2].x * boundaryScale,
        boundaryData[2].z * boundaryScale,
        boundaryData[2].y * boundaryScale
      );

      setP1(p1);
      setP2(p2);
      setP3(p3);

      const v1 = new Vector3().subVectors(p2, p1);
      const v2 = new Vector3().subVectors(p3, p1);
      const normal = new Vector3().crossVectors(v1, v2).normalize();
      // Calculate the quaternion to rotate the normal to align with the y-axis
      const up = new Vector3(0, 1, 0);

      // Check if normal is closer to up or down vector
      const dotProduct = normal.dot(up);
      let target = up;
      if (dotProduct < 0) {
        // Normal is closer to the down vector, flip the target
        target = new Vector3(0, -1, 0);
      }

      const quaternion = new Quaternion().setFromUnitVectors(normal, target);
      const euler = new Euler().setFromQuaternion(quaternion);

      // Calculate the inclination angle with the x-z plane (y-axis)

      // const inclinationAngle = Math.acos(Math.abs(normal.y));
      setInclination(euler);
      if (splatRef.current) {
        splatRef.current.quaternion.copy(quaternion);
      }
      const scene2 = splatRef.current;

      // Visualize the up and normal vectors
      const scene = boxRef.current;
      const origin = new Vector3(centroid.x, centroid.y, centroid.z);

      // Arrow for the normal vector
      const normalArrow = new ArrowHelper(normal, origin, 2, "cyan");
      // scene.add(normalArrow);

      // Arrow for the global up vector
      const upArrow = new ArrowHelper(up, origin, 5, "blue");
      // scene.add(upArrow);

      // Arrow for the splat up vector
      const upArrow2 = new ArrowHelper(up, origin, 5, "pink");
      // scene2.add(upArrow2)
      // Visualize v1 and v2
      const v1Arrow = new ArrowHelper(
        v1.normalize(),
        p1,
        v1.length(),
        0x0000ff
      );
      const v2Arrow = new ArrowHelper(
        v2.normalize(),
        p2,
        v2.length(),
        0xff00ff
      );
    }
  }, [boundaryData]);

  function isPointInPolygon(point, polygon) {
    let x = point.x,
      y = -point.y;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i].x,
        yi = polygon[i].y;
      let xj = polygon[j].x,
        yj = polygon[j].y;
      let intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function findFirstPointInPolygon(
    startPoint,
    polygon,
    stepSize = 0.1,
    maxIterations = 1000
  ) {
    let currentPoint = { ...startPoint };
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 },
    ];

    for (let i = 0; i < maxIterations; i++) {
      if (isPointInPolygon(currentPoint, polygon)) {
        return currentPoint;
      }

      for (const dir of directions) {
        const nextPoint = {
          x: currentPoint.x + dir.x * stepSize,
          y: currentPoint.y + dir.y * stepSize,
        };
        if (isPointInPolygon(nextPoint, polygon)) {
          return nextPoint;
        }
      }

      // Move the current point in a spiral pattern
      currentPoint.x += Math.cos(i * 0.5) * stepSize * i;
      currentPoint.y += Math.sin(i * 0.5) * stepSize * i;
    }

    return null; // No point found inside the polygon within the maximum iterations
  }

  function scalePolygon(polygon, scale) {
    return polygon.map((vertex) => ({
      x: vertex.x * scale,
      y: vertex.y * scale,
    }));
  }

  const previousPosition = useRef({ x: 0, y: 0, z: 0 });
  function CameraControls({ polygon }) {
    useFrame((state) => {
      let newPosition = state.camera.position.clone();
      state.camera.position.set(
        state.camera.position.x,
        0,
        state.camera.position.x
      );
      const point = { x: newPosition.x + 0.2, y: newPosition.z + 0.2 }; // Adjust depending on your coordinate system
      const scaledPolygon = scalePolygon(polygon, boundaryScale);
      if (isPointInPolygon(point, scaledPolygon)) {
        previousPosition.current = newPosition.clone();
      } else {
        newPosition = previousPosition.current;
      }
      state.camera.position.copy(newPosition);
    });
    return null;
  }

  return (
    <Canvas>
      {boundaryData && !fly && <CameraControls polygon={boundaryData} />}
      {fly && <FlyControls rollSpeed={0.2}/>}
      {!fly && (
        <>
          <CameraControls polygon={boundaryData} />
          {deviceType === "desktop" && (
            <PIPCameraControls
              focalLength={cameraFocalLength}
              position={[centroid.x, 10, centroid.y]}
              minPolarAngle={(2 * Math.PI) / 6}
              maxPolarAngle={(2 * Math.PI) / 3}
              speed={100}
              height={0}
            />
          )}
        </>
      )}
      {deviceType === "mobile" && (
        <TouchPIPControls
          focalLength={cameraFocalLength}
          setTapType={setTapType}
          tapType={tapType}
          setMoveCamera={setMoveCamera}
          moveCamera={moveCamera}
          isTouching={isTouching}
          touchStart={touchStart}
          touchEnd={touchEnd}
          setTouchStart={setTouchStart}
          hasMoved={hasMoved}
        />
      )}
      <ambientLight />
      <Splat src="room.splat" rotation={[-Math.PI / 12, 0, 0]} />
      <Html
        position={[-4, 0, -1]}
        rotation={[0, Math.PI / 2.7, 0]}
        scale={0.1}
        style={{ userSelect: "none" }}
        castShadow
        receiveShadow
        occlude="blending"
        transform
      >
        <iframe
          id="showurl"
          title="embed"
          width={1000}
          height={700}
          src={
            streamid
              ? `../spatialcast/players/vodView.html?streamid=${streamid}&showControl=false`
              : `../spatialcast/players/vodView.html?streamid=67f3ff3d-8dd5-4855-93af-c4da4260588a&showControl=false`
          }
        />
      </Html>

      {/* {boundaryData &&
        boundaryData.map((vertex, index) => (
          <mesh
            key={index}
            position={[
              vertex.x * boundaryScale,
              0 * vertex.z * boundaryScale,
              -vertex.y * boundaryScale,
            ]}
          >
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color="red" />
          </mesh>
        ))}

      {boundaryData && (
        <group>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={boundaryData.length * 2}
                array={Float32Array.from(
                  boundaryData.flatMap((vertex, index, array) => {
                    const nextVertex = array[(index + 1) % array.length];
                    return [
                      vertex.x * boundaryScale,
                      0 * vertex.z * boundaryScale,
                      -vertex.y * boundaryScale,
                      nextVertex.x * boundaryScale,
                      0 * nextVertex.z * boundaryScale,
                      -nextVertex.y * boundaryScale,
                    ];
                  })
                )}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="red" />
          </line>
        </group>
      )} */}
    </Canvas>
  );
}

export default Scene;
