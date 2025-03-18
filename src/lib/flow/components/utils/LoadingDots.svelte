<script>
  // No need for size prop as we'll inherit styling from parent
</script>

<span class="loading-dots" aria-label="Loading indicator">
  <span class="dot"></span>
  <span class="dot"></span>
  <span class="dot"></span>
</span>

<style>
  .loading-dots {
    display: inline-flex;
    margin-left: 2px;
  }
  
  .dot {
    opacity: 0.4;
    animation: dot-animation 1.4s infinite;
    margin: 0 1px;
  }
  
  .dot:after {
    content: '.';
  }
  
  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes dot-animation {
    0%, 100% { 
      opacity: 0.4;
    }
    40% { 
      opacity: 1;
    }
  }
</style>