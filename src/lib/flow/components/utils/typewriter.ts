import { writable, get } from 'svelte/store';

/**
 * Creates a typewriter effect that types out messages line by line.
 * @param messages Array of messages to type out
 * @param typingSpeed Speed of typing in milliseconds per character
 * @returns 
 */
export function createTypewriter(messages: string[], typingSpeed = 48) {
  // Current displayed text
  const typedText = writable<string[]>([]);
  // Current line being typed
  const currentLineIndex = writable<number>(0);
  // Current progress in the current line
  const progress = writable<number>(0);
  // Whether typewriter is currently typing
  const isTyping = writable<boolean>(false);
  
  // Type the next character
  function typeNextChar() {
    progress.update(p => {
      const lineIndex = get(currentLineIndex);
      
      if (lineIndex >= messages.length) {
        isTyping.set(false);
        return p;
      }
      
      const currentLine = messages[lineIndex];
      
      if (p < currentLine.length) {
        // Type next character in current line
        typedText.update(lines => {
          // Initialize the array if needed
          if (lines.length === 0) {
            lines = [''];
          }
          
          // Replace or update the current line being typed
          lines[lineIndex] = currentLine.substring(0, p + 1);
          return lines;
        });
        return p + 1;
      } else {
        // Line is complete, stop typing
        isTyping.set(false);
        return p;
      }
    });
    
    // Check if we should continue typing
    if (get(isTyping)) {
      setTimeout(typeNextChar, typingSpeed);
    }
  }
  
  // Start typing the current message
  function startTyping() {
    if (get(isTyping)) return;
    
    // Initialize with empty array
    typedText.set(['']);
    isTyping.set(true);
    typeNextChar();
  }
  
  // Type the next message in sequence
  function typeNextMessage() {
    if (get(isTyping)) return;
    
    const lineIndex = get(currentLineIndex);
    // If we're not at the end of the messages
    if (lineIndex < messages.length - 1) {
      // Move to the next line
      currentLineIndex.update(i => i + 1);
      progress.set(0);
      // Start typing
      isTyping.set(true);
      typeNextChar();
    }
  }
  
  return {
    typedText,
    currentLineIndex,
    isTyping,
    startTyping,
    typeNextMessage
  };
}
