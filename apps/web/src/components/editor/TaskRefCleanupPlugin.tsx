/**
 * Task Reference Cleanup Plugin
 *
 * Cleans up duplicate children in TaskRefNodes caused by a bug in earlier versions.
 * Runs once when the editor loads.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: One-time cleanup for duplicate TaskRefNode children bug
 * ===================================================================
 */

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $isTextNode, TextNode } from 'lexical';
import { $isTaskRefNode, TaskRefNode } from './nodes/TaskRefNode';

/**
 * Recursively find all TaskRefNodes in the editor tree
 */
function findAllTaskRefNodes(node: ReturnType<typeof $getRoot>): TaskRefNode[] {
  const taskRefNodes: TaskRefNode[] = [];

  const traverse = (currentNode: unknown) => {
    if ($isTaskRefNode(currentNode as TaskRefNode)) {
      taskRefNodes.push(currentNode as TaskRefNode);
    }

    // Check if node has children
    const nodeWithChildren = currentNode as { getChildren?: () => unknown[] };
    if (typeof nodeWithChildren.getChildren === 'function') {
      const children = nodeWithChildren.getChildren();
      for (const child of children) {
        traverse(child);
      }
    }
  };

  traverse(node);
  return taskRefNodes;
}

/**
 * Clean up duplicate text children in a TaskRefNode
 * Keep only the first text node that matches the expected format
 */
function cleanupTaskRefNode(taskRefNode: TaskRefNode): boolean {
  const children = taskRefNode.getChildren();

  if (children.length <= 1) {
    return false; // Nothing to clean up
  }

  const reference = taskRefNode.getReference();
  const expectedText = `#${reference}`;

  let foundValid = false;
  let modified = false;

  // Remove all children except the first valid one
  for (const child of children) {
    if ($isTextNode(child)) {
      const textNode = child as TextNode;
      if (!foundValid && textNode.getTextContent() === expectedText) {
        foundValid = true;
        // Keep this one
      } else {
        // Remove duplicate
        textNode.remove();
        modified = true;
      }
    }
  }

  // If no valid text node found, add one
  if (!foundValid && children.length === 0) {
    const textNode = new TextNode(expectedText);
    taskRefNode.append(textNode);
    modified = true;
  }

  return modified;
}

/**
 * Plugin that cleans up duplicate TaskRefNode children on editor load
 */
export function TaskRefCleanupPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Run cleanup once after editor initializes
    const timeoutId = setTimeout(() => {
      editor.update(() => {
        const root = $getRoot();
        const taskRefNodes = findAllTaskRefNodes(root);

        let cleanedCount = 0;
        for (const taskRefNode of taskRefNodes) {
          if (cleanupTaskRefNode(taskRefNode)) {
            cleanedCount++;
          }
        }

        if (cleanedCount > 0) {
          console.log(
            `[TaskRefCleanupPlugin] Cleaned up ${cleanedCount} TaskRefNode(s) with duplicate children`
          );
        }
      });
    }, 100); // Small delay to ensure content is loaded

    return () => clearTimeout(timeoutId);
  }, [editor]);

  return null;
}

export default TaskRefCleanupPlugin;
