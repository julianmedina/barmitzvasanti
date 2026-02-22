/**
 * Seed Trivia: carga 4 preguntas y 8 YouTube Shorts en Firestore (base barmitzvamedina).
 *
 * Uso:
 *   cd backend
 *   node seedTrivia.js
 *
 * Credenciales: GOOGLE_APPLICATION_CREDENTIALS o gcloud auth application-default login
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const { TRIVIA_QUESTIONS, TRIVIA_VIDEOS } = require('../scripts/triviaSeedData.js');

const DB_ID = 'barmitzvamedina';

function main() {
  if (!admin.apps.length) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'service-account.json');
    try {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } catch (e) {
      try {
        admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
      } catch (e2) {
        console.error('Credenciales no encontradas. Usá GOOGLE_APPLICATION_CREDENTIALS o gcloud auth application-default login.');
        process.exit(1);
      }
    }
  }

  const firestore = getFirestore(admin.app(), DB_ID);

  async function run() {
    const batch = firestore.batch();

    const questionsRef = firestore.collection('trivia_questions');
    TRIVIA_QUESTIONS.forEach((q, i) => {
      const ref = questionsRef.doc();
      batch.set(ref, {
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        order: q.order ?? i,
        timestamp: new Date(),
      });
    });

    const videosRef = firestore.collection('trivia_videos');
    TRIVIA_VIDEOS.forEach((v, i) => {
      const ref = videosRef.doc();
      batch.set(ref, {
        name: v.name || `Short ${i + 1}`,
        youtubeId: v.youtubeId || null,
        order: v.order ?? i,
        timestamp: new Date(),
      });
    });

    await batch.commit();
    console.log('OK: 4 preguntas y', TRIVIA_VIDEOS.length, 'YouTube Shorts cargados en Firestore.');
    process.exit(0);
  }

  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

main();
