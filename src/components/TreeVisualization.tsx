import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Tree, Node } from '../types/Tree';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface TreeVisualizationProps {
  tree: Tree<string>;
}

const TreeVisualization: React.FC<TreeVisualizationProps> = ({ tree }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const [selectedNode, setSelectedNode] = useState<Node<string> | null>(null);
  const [isHoveringNode, setIsHoveringNode] = useState(false);
  const lastHoveredNodeRef = useRef<Node<string> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // シーンの初期化
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // カメラの設定
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    cameraRef.current = camera;

    // レンダラーの設定
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // コントロールの設定
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // ライトの設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // ポイントライトの追加
    const pointLight = new THREE.PointLight(0x9c27b0, 1, 10);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // ウィンドウリサイズのハンドリング
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // アニメーションループ
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  const createNodeMesh = (data: string, node: Node<string>): THREE.Group => {
    const group = new THREE.Group();
    group.userData = { node };

    // ノードの球体
    const geometry = new THREE.SphereGeometry(0.3);
    const material = new THREE.MeshPhongMaterial({
      color: 0x9c27b0, // 紫のベースカラー
      shininess: 100,
      specular: 0xffffff,
      emissive: 0x4a148c, // 暗めの紫のエミッシブ
      emissiveIntensity: 0.2,
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // 光るエフェクト
    const glowGeometry = new THREE.SphereGeometry(0.35);
    const glowMaterial = new THREE.MeshPhongMaterial({
      color: 0x9c27b0,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    // テキストの作成
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      canvas.width = 256;
      canvas.height = 64;
      context.fillStyle = '#ffffff';
      context.font = 'bold 24px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(data, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const textMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
      });
      const textSprite = new THREE.Sprite(textMaterial);
      textSprite.scale.set(2, 0.5, 1);
      textSprite.position.y = 0.5;
      group.add(textSprite);
    }

    return group;
  };

  const handleClick = useCallback((event: MouseEvent) => {
    if (!sceneRef.current || !cameraRef.current) return;

    // マウス位置の正規化
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // レイキャスト
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    if (intersects.length > 0) {
      let clickedObject = intersects[0].object;
      let currentNode = clickedObject.userData.node;

      // グループ内のオブジェクトをクリックした場合、親のグループを探す
      while (!currentNode && clickedObject.parent) {
        currentNode = clickedObject.parent.userData.node;
        clickedObject = clickedObject.parent;
      }

      if (currentNode) {
        setSelectedNode(currentNode);
      }
    } else {
      setSelectedNode(null);
    }
  }, []);

  const renderTree = useCallback(() => {
    if (!tree.root || !sceneRef.current) return;

    // シーンをクリア
    while (sceneRef.current.children.length > 0) {
      sceneRef.current.remove(sceneRef.current.children[0]);
    }

    // ライトを再追加
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    sceneRef.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    sceneRef.current.add(directionalLight);

    // ポイントライトの追加
    const pointLight = new THREE.PointLight(0x9c27b0, 1, 10);
    pointLight.position.set(0, 5, 5);
    sceneRef.current.add(pointLight);

    // ルートノードから描画開始
    renderNode(tree.root, new THREE.Vector3(0, 5, 0));
  }, [tree.root]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!selectedNode) return;

      if (event.key === 'a' || event.key === 'A') {
        // ノードの追加
        const newNode = selectedNode.add(`Child ${selectedNode.children.length + 1}`);
        setSelectedNode(newNode);
        renderTree();
      } else if (event.key === 'd' || event.key === 'D') {
        // ノードの削除
        if (selectedNode !== tree.root) {
          const parent = findParentNode(tree.root!, selectedNode);
          if (parent) {
            parent.remove(selectedNode.data);
            setSelectedNode(null);
            renderTree();
          }
        }
      }
    },
    [selectedNode, tree.root, renderTree]
  );

  const findParentNode = (current: Node<string>, target: Node<string>): Node<string> | null => {
    if (current.children.includes(target)) {
      return current;
    }
    for (const child of current.children) {
      const found = findParentNode(child, target);
      if (found) return found;
    }
    return null;
  };

  const renderNode = (node: Node<string>, position: THREE.Vector3, depth: number = 0) => {
    if (!sceneRef.current) return;

    const nodeMesh = createNodeMesh(node.data, node);
    nodeMesh.position.copy(position);

    // 選択されたノードの色を変更
    if (node === selectedNode) {
      const sphere = nodeMesh.children[0] as THREE.Mesh;
      const material = sphere.material as THREE.MeshPhongMaterial;
      material.color.set(0xe040fb); // 明るい紫
      material.emissive.set(0x7b1fa2); // 暗めの紫
      material.emissiveIntensity = 0.4;
    }

    sceneRef.current.add(nodeMesh);

    // 子ノードの描画
    const childCount = node.children.length;
    const spacing = Math.min(2, 4 / (depth + 1));

    node.children.forEach((child, index) => {
      const childPosition = new THREE.Vector3(
        position.x + (index - (childCount - 1) / 2) * spacing,
        position.y - 1.5,
        position.z
      );

      // 親子を結ぶ線を描画
      const points = [position, childPosition];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x9c27b0,
        transparent: true,
        opacity: 0.6,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      sceneRef.current?.add(line);

      renderNode(child, childPosition, depth + 1);
    });
  };

  const updateCursor = (isOverNode: boolean) => {
    if (containerRef.current) {
      containerRef.current.style.cursor = isOverNode ? 'pointer' : 'default';
    }
  };

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!sceneRef.current || !cameraRef.current) return;

      // マウス位置の正規化
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // レイキャスト
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

      let foundNode = false;
      if (intersects.length > 0) {
        let hoveredObject = intersects[0].object;
        let currentNode = hoveredObject.userData.node;

        // グループ内のオブジェクトをホバーした場合、親のグループを探す
        while (!currentNode && hoveredObject.parent) {
          currentNode = hoveredObject.parent.userData.node;
          hoveredObject = hoveredObject.parent;
        }

        if (currentNode) {
          foundNode = true;
          if (currentNode !== lastHoveredNodeRef.current) {
            lastHoveredNodeRef.current = currentNode;
            setIsHoveringNode(true);
            updateCursor(true);
          }
        }
      }

      if (!foundNode && isHoveringNode) {
        lastHoveredNodeRef.current = null;
        setIsHoveringNode(false);
        updateCursor(false);
      }
    },
    [isHoveringNode]
  );

  const handleMouseLeave = useCallback(() => {
    lastHoveredNodeRef.current = null;
    setIsHoveringNode(false);
    updateCursor(false);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // イベントリスナーの追加
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // クリーンアップ
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleClick, handleKeyPress, handleMouseMove, handleMouseLeave]);

  useEffect(() => {
    renderTree();
  }, [tree, selectedNode, renderTree]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ width: '100vw', height: '100vh' }}
      onMouseLeave={handleMouseLeave}
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: '#ffffff',
          backgroundColor: 'rgba(156, 39, 176, 0.8)',
          padding: '15px',
          borderRadius: '10px',
          fontFamily: 'Arial, sans-serif',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>操作方法</h3>
        <p style={{ margin: '5px 0' }}>クリック: ノードを選択</p>
        <p style={{ margin: '5px 0' }}>Aキー: 選択したノードに子を追加</p>
        <p style={{ margin: '5px 0' }}>Dキー: 選択したノードを削除</p>
        <p style={{ margin: '5px 0' }}>マウス: 回転・ズーム・パン</p>
      </div>
    </motion.div>
  );
};

export default TreeVisualization;
