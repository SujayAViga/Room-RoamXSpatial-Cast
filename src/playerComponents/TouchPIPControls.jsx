import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const TouchPIPControls = ({ isTouching, touchStart, touchEnd, setTouchStart, hasMoved,moveCamera,setMoveCamera,tapType,setTapType,focalLength }) => {
  const cameraRef = useRef();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const {camera} = useThree()
  const [distanceCovered, setDistanceCovered] = useState(0);

  // Update the camera rotation based on touch movements
  useFrame(() => {
    
    if (moveCamera && distanceCovered < tapType) {
      // move camera by 0.1 units in the forward direction
      const forward = new THREE.Vector3(0, 0, -0.1); // create a forward vector

      // rotate the forward vector to match the camera's rotation
      forward.applyQuaternion(cameraRef.current.quaternion);

      // move the camera in the direction of the rotated forward vector
      cameraRef.current.position.add(forward);
      camera.position.y = 0
      // update the distance covered
      setDistanceCovered(distanceCovered + 0.1);
    } else if (distanceCovered >= tapType) {
      // stop moving the camera once the distance covered is 1 unit
      // setTapType()
      setMoveCamera(false);
      setDistanceCovered(0); // reset the distance covered for the next move
    }
    if (isTouching && cameraRef.current && hasMoved) {
      const deltaX = (touchEnd.x - touchStart.x) * 0.005;
      const deltaY = (touchEnd.y - touchStart.y) * 0.005;

      yaw.current -= deltaX;
      pitch.current -= deltaY;

      // Clamp the pitch to avoid looking too far up or down
      pitch.current = Math.max(-Math.PI/6, Math.min(Math.PI/6, pitch.current));

      // Create a quaternion for the yaw (horizontal rotation)
      const yawQuat = new THREE.Quaternion();
      yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);

      // Create a quaternion for the pitch (vertical rotation)
      const pitchQuat = new THREE.Quaternion();
      pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch.current);

      // Combine the yaw and pitch rotations
      const combinedQuat = new THREE.Quaternion();
      combinedQuat.multiplyQuaternions(yawQuat, pitchQuat);

      cameraRef.current.quaternion.copy(combinedQuat);

      setTouchStart(touchEnd);
    }
  });

  return <PerspectiveCamera fov={focalLength} ref={cameraRef} makeDefault position={[0, 0, 5]} />;
};

export default TouchPIPControls;
