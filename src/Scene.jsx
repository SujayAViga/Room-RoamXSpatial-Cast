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
  const [deviceType, setDeviceType] = useState("desktop");
  const [screenHeight, setScreenHeight] = useState("100vh");

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
      if (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        )
      ) {
        setDeviceType("mobile");
        setScreenHeight("85vh");
      } else {
        setDeviceType("desktop");
        setScreenHeight("100vh");
      }
    };
    detectDeviceType();
    // Add event listener for orientation change, if needed
    window.addEventListener("orientationchange", detectDeviceType);
    return () => {
      window.removeEventListener("orientationchange", detectDeviceType);
    };
  }, []);

  // rotate the splat to match the normal vector
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
        boundaryData[5].x * boundaryScale,
        boundaryData[5].z * boundaryScale,
        boundaryData[5].y * boundaryScale
      );
      const p3 = new Vector3(
        boundaryData[10].x * boundaryScale,
        boundaryData[10].z * boundaryScale,
        boundaryData[10].y * boundaryScale
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

  // check if a point is inside a polygon
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

  // mobile fps
  const [tapType, setTapType] = useState(null);
  const [moveCamera, setMoveCamera] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // fov change
  // State to manage initial pinch distance and camera focal length
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [cameraFocalLength, setCameraFocalLength] = useState(110); // Set your camera's initial focal length

  // Helper function to calculate distance between two points
  function getDistance(touches) {
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const [fingers, setFingers] = useState(0);
  // Function to handle touch start
  const handleTouchStart = (event) => {
    setIsTouching(true);
    setFingers(event.touches.length);

    if (event.touches.length === 2) {
      // Check if two fingers are used
      const distance = getDistance(event.touches);
      setInitialPinchDistance(distance);
      // setIsTouching(true);
    }

    if (event.touches.length === 1) {
      setTouchStart({
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      });
      setTouchEnd({
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      });
      setHasMoved(false);
    }
  };

  // Function to handle touch move
  const handleTouchMove = (event) => {
    if (isTouching && event.touches.length === 2) {
      const currentDistance = getDistance(event.touches);
      if (initialPinchDistance) {
        var scale =
          currentDistance < initialPinchDistance
            ? currentDistance / initialPinchDistance
            : -currentDistance / initialPinchDistance;
        setInitialPinchDistance(currentDistance);
        var newFocalLength = cameraFocalLength + scale; // Adjust scale factor according to your camera setup
        if (newFocalLength < 40) {
          newFocalLength = 40;
        } else if (newFocalLength > 110) {
          newFocalLength = 110;
        }
        setCameraFocalLength(newFocalLength);
      }
    }

    if (isTouching && event.touches.length === 1) {
      const newTouchEnd = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      if (
        Math.abs(newTouchEnd.x - touchStart.x) > 2 ||
        Math.abs(newTouchEnd.y - touchStart.y) > 2
      ) {
        setHasMoved(true);
      }
      setTouchEnd(newTouchEnd);
    }
  };

  // Function to handle touch end
  const handleTouchEnd = (event) => {
    setIsTouching(false);
    setInitialPinchDistance(null);
    setFingers(0);
    setIsTouching(false);
  };

  const clickTimeout = useRef(null);

  const handleClick = () => {
    // Clear any existing timeout to prevent the single click action
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
    }
    // Set a timeout to call the single click handler after 300ms
    clickTimeout.current = setTimeout(() => {
      // Your single click logic here
      if (moveCamera) {
        setMoveCamera(false);
        return;
      }
      setTapType(1);
      setMoveCamera(true);
    }, 200);
  };

  const handleDoubleClick = () => {
    // Clear the timeout to prevent the single click handler from being called
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
    }
    // Your double click logic here
    if (moveCamera) {
      setMoveCamera(false);
      return;
    }
    setTapType(2.5);
    setMoveCamera(true);
  };

  useEffect(() => {
    console.log("Inclination updated:", inclination);
  }, [inclination]);

  return (
    <Canvas gl={{ antialias: false }} onDoubleClick={handleDoubleClick} onClick={handleClick} onTouchEnd={handleTouchEnd} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
      {boundaryData && !fly && <CameraControls polygon={boundaryData} />}
      {fly && <FlyControls rollSpeed={0.2} />}
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
      <Splat
        src="https://huggingface.co/datasets/sujayA7299/Splat-data/resolve/main/CircularHall.splat"
        chunkSize={0.005}
        rotation={[inclination.x, inclination.y, -inclination.z]}
      />
      <mesh ref={boxRef}></mesh>
      <mesh ref={splatRef}></mesh>

      <Html
        position={[-4, 0, -1]}
        rotation={[0, Math.PI / 2.7, 0]}
        scale={0.1}
        style={{ userSelect: "none" }}
        // fullscreen
        transform
        lookAt={[0, 0, 0]}
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

      {/* <iframe
          id="showurl"
          title="embed"
          width={1000}
          height={700}          
          src={
            streamid
              ? `../spatialcast/players/vodView.html?streamid=${streamid}&showControl=false`
              : `../spatialcast/players/vodView.html?streamid=67f3ff3d-8dd5-4855-93af-c4da4260588a&showControl=false`
          }
        /> */}

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
