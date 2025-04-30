export class Node<T> {
  data: T;
  children: Node<T>[];

  constructor(data: T) {
    this.data = data;
    this.children = [];
  }

  add(data: T): Node<T> {
    const node = new Node(data);
    this.children.push(node);
    return node;
  }

  remove(data: T): boolean {
    const index = this.children.findIndex(child => child.data === data);
    if (index !== -1) {
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }
}

export class Tree<T> {
  root: Node<T> | null;

  constructor() {
    this.root = null;
  }

  traverseBF(fn: (node: Node<T>) => void): void {
    if (!this.root) return;

    const queue: Node<T>[] = [this.root];
    while (queue.length > 0) {
      const node = queue.shift()!;
      fn(node);
      queue.push(...node.children);
    }
  }

  traverseDF(fn: (node: Node<T>) => void): void {
    if (!this.root) return;

    const traverse = (node: Node<T>) => {
      fn(node);
      node.children.forEach(traverse);
    };

    traverse(this.root);
  }
}
