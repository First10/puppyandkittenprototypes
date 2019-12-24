RCDL.utilities.sleep = (milliseconds) => {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
};

RCDL.features.quiz = {
  defaultSelector: '.rc-quiz',
  // Default delay between clicking the answer button and moving to the next slide.
  answerDelay: 500,
  // Global in-memory state used for controlling the quiz.
  glabalState: [],
  // Saved state is a backup of the in-memory state that used when revisiting the page.
  savedState: null,
  start: ({
            element,
            selector = RCDL.features.quiz.defaultSelector
          }) => {
    RCDL.utilities.DOMcheckElements({
      element,
      selectors: selector,
      name: 'quiz',
      start: true
    })
      .forEach(element => RCDL.features.quiz.create({
        quizContainer: element
      }));
  },
  create: ({
             quizContainer
           }) => {
    // Create the default data and bindings for the quiz.
    let quizObj = {
      ...RCDL.features.quiz.getParts({
        quizContainer,
      }),
      pager: {
        correct: 0,
        outOf: 0
      },
      currentSlide: 0,
      answers: {}
    };

    quizObj.listeners = {
      // Save this here for reuse or removal later.
      interaction: RCDL.features.quiz.interaction({
        quizId: quizObj.quizId,
        quizContainer
      }),
      updateDOM: RCDL.features.quiz.updateDOM({quizId: quizObj.quizId})
    };
    // Setup event delegation for the quiz.
    quizContainer.addEventListener('click', quizObj.listeners.interaction);
    quizContainer.addEventListener('keyup', quizObj.listeners.interaction);

    // Setup the local storage if it hasn't been already.
    RCDL.features.quiz.setupLocalStateStore();

    RCDL.features.quiz
      .getState({
        quizId: quizObj.quizId
      })
      .then(savedQuizObj => {
        if (savedQuizObj !== null) {
          RCDL.features.quiz.glabalState.push(Object.assign(quizObj, savedQuizObj));
        } else {
          RCDL.features.quiz.glabalState.push(quizObj);
        }

        // Now the data is upto date we can update the DOM.
        quizObj.listeners.updateDOM();
      })
      .catch(err => {
        throw new Error(`RCDL quiz Error: Failed to fetch saved state. Error: ${err}`);
      });
  },
  setupLocalStateStore: () => {
    if (RCDL.features.quiz.savedState === null) {
      RCDL.features.quiz.savedState = localforage.createInstance({
        name: 'RCDL quiz',
        version: 1.0,
        storeName: 'RCDL_quiz',
        description: 'State storage for RCDL quizzes'
      });
    }
  },
  interaction: (
    {
      quizId,
      quizContainer
    }) => {
    // Curry the handler so we can bake in the quiz id.
    return (e) => {
      let updates = {
        quizId,
        quizSlide: RCDL.utilities.closest(e.target, '.rc-quiz__slide')
      };
      if (e.target.matches('.rc-quiz__answer')) {
        updates.quizAnswer = e.target.getAttribute('data-rc-quiz-answer');
        updates.quizSlideChange = 'increment';
        updates.quizQuestion = e.target.textContent;
        RCDL.features.quiz.updateState(updates);
      }
      if (e.target.matches('.rc-quiz__next')) {
        e.preventDefault();
        updates.quizSlideChange = 'increment';
        RCDL.features.quiz.updateState(updates);
      }
      if (e.target.matches('.rc-quiz__back')) {
        e.preventDefault();
        updates.quizSlideChange = 'decrement';
        RCDL.features.quiz.updateState(updates);
      }
      if (e.target.matches('.rc-quiz__start-over')) {
        RCDL.features.quiz.savedState
          .removeItem(`RCDL_quiz_${quizId}`)
          .then(() => {
            RCDL.features.quiz.create({
              quizContainer
            });
        }).catch(err => {
          throw new Error(`RCDL quiz: Failed to remove quiz data: ${quizId}. Error: ${err}`);
        });
      }
    }
  },
  getParts: (
    {
      quizContainer
    }) => {
    return {
      quizId: quizContainer.getAttribute('id'),
      parts: {
        quizContainer: quizContainer.getElementsByClassName('rc-quiz'),
        quizSlides: Array.from(quizContainer.getElementsByClassName('rc-quiz__slide')),
        answersBtns: Array.from(quizContainer.getElementsByClassName('rc-quiz__answer')),
        nextBtns: Array.from(quizContainer.getElementsByClassName('rc-quiz__next')),
        previousBtns: Array.from(quizContainer.getElementsByClassName('rc-quiz__back')),
        finalScoreLabel: Array.from(quizContainer.getElementsByClassName('rc-quiz__final-score'))[0],
        resetBtn: quizContainer.getElementsByClassName('rc-quiz__start-over')[0]
      }
    }
  },
  updateState: (
    {
      quizId,
      quizSlide,
      quizAnswer,
      quizSlideChange,
      quizQuestion
    }) => {
    // TODO: add question, answers and selection to output object for tracking later.
    RCDL.features.quiz.glabalState = RCDL.features.quiz.glabalState.map(quizObj => {
      if (quizObj.quizId === quizId) {
        // Get the slide position.
        let currentSlide = quizObj.parts.quizSlides.indexOf(quizSlide);
        quizObj.currentSlide = quizSlideChange === 'increment' ? ++currentSlide : --currentSlide;

        if (quizAnswer === "0" || quizAnswer === "1") {
          quizObj.answers[quizSlide.getAttribute('data-rc-answer-id')] = {
            answer: quizAnswer,
            question: quizQuestion
          };

          // Update the pager state.
          quizObj.pager = {
            correct: quizObj.pager.correct + parseInt(quizAnswer),
            outOf: Object.keys(quizObj.answers).length
          }
        } else if (typeof quizAnswer !== 'undefined') {
          throw new Error(`RCDL quiz: Failed to get state for quiz id: ${quizId}.
              Unknown answer value: ${quizAnswer} for question ${quizQuestion}.`);
        }

        RCDL.features.quiz.saveState({
          quizId,
          quizObj
        }).then(() => {
          quizObj.listeners.updateDOM();
        });
      }
      return quizObj;
    });
  },
  getState: async (
    {
      quizId
    }) => {
    return new Promise((yes, no) => {
      RCDL.features.quiz.savedState
        .getItem(`RCDL_quiz_${quizId}`)
        .then(res => yes(res))
        .catch(err => {
          throw new Error(`RCDL quiz: Failed to get state for quiz id: ${quizId}. Error: ${err}`);
        })
    })
  },
  saveState: async (
    {
      quizId,
      quizObj
    }) => {
    return new Promise((yes, no) => {
      // Copy the quiz object to avoid mutations.
      let saveStateitems = Object.assign({}, quizObj);
      // Remove items at that bound to the DOM and shouldn't be saved.
      delete saveStateitems.parts;
      delete saveStateitems.listeners;

      // Save to localstorage.
      RCDL.features.quiz.savedState
        .setItem(`RCDL_quiz_${quizId}`, saveStateitems)
        .then(res => {
          yes();
        })
        .catch(err => {
          throw new Error(`RCDL quiz: Failed to update state for quiz id: ${quizId}.
                    Obj: ${JSON.stringify(saveStateitems)}. Error: ${err}`)
        })
    });
  },
  updateDOM: (
    {
      quizId
    }) => {
    return () => {
      RCDL.utilities.sleep(RCDL.features.quiz.answerDelay);
      // Find the quiz data object.
      let quizObj = RCDL.features.quiz.glabalState.filter(quiz => quizId === quiz.quizId);

      if (quizObj.length === 0) {
        throw new Error(`RCDL Quiz: Missing quiz with the ID of ${quizId}.`);
      }
      if (quizObj.length > 1) {
        throw new Error(`RCDL Quiz: Duplicate quiz with the ID of ${quizId}.`);
      }

      // We can safely flatten this as we know it's just one item.
      quizObj = quizObj[0];

      // Loop through the quiz slides and add/remove the hidden class as required.
      quizObj.parts.quizSlides.forEach((slide, index, array) => {
        try {
          if (slide.hasAttribute('data-rc-answer-id') === false && typeof quizObj.answers[Object.keys(quizObj.answers)[(index - 1) / 2]] !== 'undefined') {
            // Get the answer for the previous slide and invert it so we can hide the answer title not required.
            const remove = slide.querySelector(
              `[data-rc-quiz-response="${quizObj.answers[Object.keys(quizObj.answers)[(index - 1) / 2]].answer
              === '0' ? '1' : '0'}`);
            const add = slide.querySelector(
              `[data-rc-quiz-response="${quizObj.answers[Object.keys(quizObj.answers)[(index - 1) / 2]].answer}`);
            // Hide answer text that isn't relevant.
            RCDL.utilities.modifyClass('add', remove, 'rc-hidden');
            // Show the answer text that is relevant.
            RCDL.utilities.modifyClass('remove', add, 'rc-hidden');
          }

          if (index === array.length - 1) {
            quizObj.parts.finalScoreLabel.textContent = quizObj.parts.finalScoreLabel.textContent
              .replace(/\d\/\d/g, `${quizObj.pager.correct}/${quizObj.pager.outOf}`)
          }

          // Move the hidden utility class along to progress the quiz.
          RCDL.utilities.modifyClass(index !== quizObj.currentSlide ? 'add' : 'remove', slide, 'rc-hidden');
        }
        catch(err) {
          throw new Error(`RCDL Quiz: Missing quiz with the ID of ${quizId}. Error setting correct answer title: ${err}`);
        }

      });
    }
  }
};

RCDL.features.quiz.start({
  element: document
});
