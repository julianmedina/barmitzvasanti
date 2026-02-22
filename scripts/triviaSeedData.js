/**
 * Datos iniciales para la Trivia Medina.
 * 4 preguntas + 8 YouTube Shorts para cuando el usuario pierde.
 */

const TRIVIA_QUESTIONS = [
  {
    question: '¿De qué cuadro es Medina?',
    options: ['Boca', 'River', 'Atlanta', 'Racing'],
    correctIndex: 1,
    order: 0,
  },
  {
    question: '¿Cuál es su comida favorita?',
    options: ['Sushi', 'Asado', 'Milanesa con Puré', 'Fideos con Tuco'],
    correctIndex: 2,
    order: 1,
  },
  {
    question: '¿En qué posición juega al fútbol?',
    options: ['Arquero', 'Defensor', 'Mediocampista', 'Delantero'],
    correctIndex: 1,
    order: 2,
  },
  {
    question: '¿Cuál es su materia preferida en el colegio?',
    options: ['Matemática', 'Gimnasia', 'Historia', 'Recreo'],
    correctIndex: 3,
    order: 3,
  },
];

// 8 YouTube Shorts para la trivia (cuando el usuario pierde)
const TRIVIA_VIDEOS = [
  { name: 'Short 1', order: 0, youtubeId: 'WjMbH6RSMFc' },
  { name: 'Short 2', order: 1, youtubeId: '-KbKlrb3sn0' },
  { name: 'Short 3', order: 2, youtubeId: '9LsTK-rp8wE' },
  { name: 'Short 4', order: 3, youtubeId: 'B72ihL1LKrk' },
  { name: 'Short 5', order: 4, youtubeId: 'vovAE0FrAh4' },
  { name: 'Short 6', order: 5, youtubeId: '-bRLWfznUPs' },
  { name: 'Short 7', order: 6, youtubeId: 'TIVlHFpoLsk' },
  { name: 'Short 8', order: 7, youtubeId: '0E5ouMxqfEA' },
];

module.exports = { TRIVIA_QUESTIONS, TRIVIA_VIDEOS };
