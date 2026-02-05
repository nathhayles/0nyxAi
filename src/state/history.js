let undoStack = [];
let redoStack = [];

export function pushHistory(state) {
  undoStack.push(JSON.stringify(state));
  redoStack = [];
}

export function undo(currentState) {
  if (!undoStack.length) return currentState;
  redoStack.push(JSON.stringify(currentState));
  return JSON.parse(undoStack.pop());
}

export function redo(currentState) {
  if (!redoStack.length) return currentState;
  undoStack.push(JSON.stringify(currentState));
  return JSON.parse(redoStack.pop());
}
