const QUESTIONS = {
  '11-14': [
    { id: 'c11_1', question: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1 },
    { id: 'c11_2', question: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], correctIndex: 1 },
    { id: 'c11_3', question: 'What is the largest organ in the human body?', options: ['Liver', 'Brain', 'Skin', 'Heart'], correctIndex: 2 },
    { id: 'c11_4', question: 'Which gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], correctIndex: 2 },
    { id: 'c11_5', question: 'What is the freezing point of water in Celsius?', options: ['-1', '0', '1', '100'], correctIndex: 1 },
  ],
  '15-24': [
    { id: 'c15_1', question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctIndex: 2 },
    { id: 'c15_2', question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correctIndex: 2 },
    { id: 'c15_3', question: 'Which planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], correctIndex: 1 },
    { id: 'c15_4', question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correctIndex: 2 },
    { id: 'c15_5', question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Membrane'], correctIndex: 1 },
    { id: 'c15_6', question: 'Which programming paradigm uses immutable data?', options: ['OOP', 'Functional', 'Procedural', 'Imperative'], correctIndex: 1 },
    { id: 'c15_7', question: 'What is the speed of light approximately?', options: ['3×10⁶ m/s', '3×10⁷ m/s', '3×10⁸ m/s', '3×10⁹ m/s'], correctIndex: 2 },
    { id: 'c15_8', question: 'Who wrote "1984"?', options: ['Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'H.G. Wells'], correctIndex: 1 },
  ],
  '25-64': [
    { id: 'c25_1', question: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?', options: ['5 minutes', '20 minutes', '100 minutes', '500 minutes'], correctIndex: 0 },
    { id: 'c25_2', question: 'Which element has the atomic number 79?', options: ['Silver', 'Platinum', 'Gold', 'Lead'], correctIndex: 2 },
    { id: 'c25_3', question: 'What is the term for a word that is spelled the same forwards and backwards?', options: ['Homonym', 'Palindrome', 'Anagram', 'Synonym'], correctIndex: 1 },
    { id: 'c25_4', question: 'In which year did the Berlin Wall fall?', options: ['1987', '1988', '1989', '1990'], correctIndex: 2 },
    { id: 'c25_5', question: 'What is the hardest natural substance on Earth?', options: ['Titanium', 'Diamond', 'Quartz', 'Steel'], correctIndex: 1 },
    { id: 'c25_6', question: 'If a+b=10 and a²+b²=58, what is a×b?', options: ['20', '21', '24', '25'], correctIndex: 1 },
    { id: 'c25_7', question: 'Which blood type is the universal donor?', options: ['A+', 'B-', 'O-', 'AB+'], correctIndex: 2 },
    { id: 'c25_8', question: 'What is the smallest prime number greater than 10?', options: ['11', '13', '17', '19'], correctIndex: 0 },
    { id: 'c25_9', question: 'Who painted the ceiling of the Sistine Chapel?', options: ['Da Vinci', 'Raphael', 'Michelangelo', 'Donatello'], correctIndex: 2 },
    { id: 'c25_10', question: 'What is the SI unit of electric current?', options: ['Volt', 'Watt', 'Ampere', 'Ohm'], correctIndex: 2 },
  ],
  '65+': [
    { id: 'c65_1', question: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIndex: 3 },
    { id: 'c65_2', question: 'What famous ship sank on its maiden voyage in 1912?', options: ['Lusitania', 'Titanic', 'Britannic', 'Olympic'], correctIndex: 1 },
    { id: 'c65_3', question: 'How many bones are in the adult human body?', options: ['106', '206', '306', '406'], correctIndex: 1 },
    { id: 'c65_4', question: 'What bird is a traditional symbol of peace?', options: ['Eagle', 'Dove', 'Raven', 'Swan'], correctIndex: 1 },
    { id: 'c65_5', question: 'Which vitamin is produced when skin is exposed to sunlight?', options: ['Vitamin A', 'Vitamin B', 'Vitamin C', 'Vitamin D'], correctIndex: 3 },
    { id: 'c65_6', question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Mississippi', 'Yangtze'], correctIndex: 1 },
    { id: 'c65_7', question: 'Who developed the first successful vaccine?', options: ['Pasteur', 'Jenner', 'Fleming', 'Koch'], correctIndex: 1 },
    { id: 'c65_8', question: 'What metal is liquid at room temperature?', options: ['Iron', 'Copper', 'Mercury', 'Silver'], correctIndex: 2 },
  ],
}

export default QUESTIONS
