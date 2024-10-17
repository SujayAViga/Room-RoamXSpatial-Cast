import './App.css'
import { Canvas } from '@react-three/fiber'
import { Box } from '@react-three/drei'
import { Suspense } from 'react'
import { OrbitControls,Splat,Html } from '@react-three/drei'

function App() {
  return (
    <Canvas>
      <OrbitControls />
        <ambientLight intensity={0.5} />
        {/* <Box position={[0, 0, 0]} /> */}
        <Splat src="room.splat" rotation={[-Math.PI / 12, 0, 0]} />
        <Html style={{ userSelect: 'none' }} castShadow receiveShadow occlude="blending" transform>
          <iframe title="embed" width={70} height={50} src="https://threejs.org/" />
        </Html>
    </Canvas>
  )
}

export default App
