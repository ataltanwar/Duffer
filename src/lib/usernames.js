const adjectives = [
  'Shadow', 'Cosmic', 'Stealth', 'Neon', 'Phantom', 'Frosty', 'Turbo',
  'Mystic', 'Savage', 'Chill', 'Pixel', 'Glitch', 'Silent', 'Rogue',
  'Blazing', 'Ghost', 'Hyper', 'Lunar', 'Vibe', 'Dank', 'Crispy',
  'Chaos', 'Lowkey', 'Sneaky', 'Spicy', 'Cloudy', 'Rusty', 'Witty',
  'Cozy', 'Bold', 'Trippy', 'Fuzzy', 'Salty', 'Radical', 'Wicked',
];

const nouns = [
  'Penguin', 'Raccoon', 'Potato', 'Toaster', 'Cactus', 'Walrus', 'Mango',
  'Goblin', 'Llama', 'Noodle', 'Wizard', 'Pirate', 'Yeti', 'Otter',
  'Pickle', 'Moth', 'Taco', 'Falcon', 'Panda', 'Donut', 'Bandit',
  'Waffle', 'Squid', 'Moose', 'Ninja', 'Duck', 'Gremlin', 'Pretzel',
  'Fox', 'Narwhal', 'Burrito', 'Viking', 'Sloth', 'Hamster', 'Chimera',
];

export function generateUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`;
}
