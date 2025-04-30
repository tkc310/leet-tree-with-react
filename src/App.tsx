import React, { useState } from 'react';
import { Tree, Node } from './types/Tree';
import TreeVisualization from './components/TreeVisualization';

const App: React.FC = () => {
  const [tree] = useState(() => {
    const tree = new Tree<string>();
    const rootNode = new Node<string>('Root');
    tree.root = rootNode;

    // サンプルデータの追加
    const child1 = rootNode.add('Child 1');
    const child2 = rootNode.add('Child 2');
    const child3 = rootNode.add('Child 3');

    child1.add('Grandchild 1.1');
    child1.add('Grandchild 1.2');
    child2.add('Grandchild 2.1');
    child3.add('Grandchild 3.1');
    child3.add('Grandchild 3.2');
    child3.add('Grandchild 3.3');

    return tree;
  });

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <TreeVisualization tree={tree} />
    </div>
  );
};

export default App;
