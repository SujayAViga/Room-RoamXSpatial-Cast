import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

const PIPCameraControls = ({minPolarAngle,maxPolarAngle,speed,height,position}) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  const [moveForward, setMoveForward] = useState(false);
  const [moveBackward, setMoveBackward] = useState(false);
  const [moveLeft, setMoveLeft] = useState(false);
  const [moveRight, setMoveRight] = useState(false);
  const [canJump, setCanJump] = useState(false);

  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const prevTime = useRef(performance.now());

  const onKeyDown = useCallback((event) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        setMoveForward(true);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        setMoveLeft(true);
        break;
      case 'ArrowDown':
      case 'KeyS':
        setMoveBackward(true);
        break;
      case 'ArrowRight':
      case 'KeyD':
        setMoveRight(true);
        break;
      case 'Space':
        if (canJump) velocity.current.y += 350;
        setCanJump(false);
        break;
      default:
        break;
    }
  }, [canJump]);

  const onKeyUp = useCallback((event) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        setMoveForward(false);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        setMoveLeft(false);
        break;
      case 'ArrowDown':
      case 'KeyS':
        setMoveBackward(false);
        break;
      case 'ArrowRight':
      case 'KeyD':
        setMoveRight(false);
        break;
      default:
        break;
    }
  }, []);

  useEffect(()=>{
    camera.position.set(position)
  },[])

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  useFrame(() => {
    // gl.render(camera);

    camera.position.y = height
    const time = performance.now();
    const delta = (time - prevTime.current) / 1000;

    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;
    velocity.current.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.current.z = Number(moveForward) - Number(moveBackward);
    direction.current.x = Number(moveRight) - Number(moveLeft);
    direction.current.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.current.z -= direction.current.z * speed * delta;
    if (moveLeft || moveRight) velocity.current.x -= direction.current.x * speed * delta;

    controlsRef.current.moveRight(-velocity.current.x * delta);
    controlsRef.current.moveForward(-velocity.current.z * delta);

    prevTime.current = time;
  });
  return <PointerLockControls minPolarAngle={minPolarAngle} maxPolarAngle={maxPolarAngle} ref={controlsRef} args={[camera, gl.domElement]} />;
};

export default PIPCameraControls;
