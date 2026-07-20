// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('action-btn');
  const card = document.getElementById('hello');

  // List of soft colors for background shifts
  const colors = ['#f0f2f5', '#e6f7ff', '#f9f0ff', '#f6ffed', '#fff7e6', '#fff0f6'];
  let colorIndex = 0;

  button.addEventListener('click', () => {
    // Rotate through colors
    colorIndex = (colorIndex + 1) % colors.length;
    document.body.style.backgroundColor = colors[colorIndex];
    
    // Add a simple animation effect to the card
    card.style.transform = 'scale(1.05)';
    setTimeout(() => {
      card.style.transform = 'none';
    }, 150);
  });
});
