# Trivia game for WhatsApp group | ![Leer en Español](README_es.md)

This userscript allows to play a trivia game in a WhatsApp group.

## Usage

1. Install Tampermonkey from the [official website](https://www.tampermonkey.net/) (if you haven’t installed it yet).
2. Add the script to Tampermonkey by [clicking here](https://raw.githubusercontent.com/GiovJ-97/Whatsapp-trivia-script/main/src/main.user.js).
3. Go to [Whatsapp Web](https://web.whatsapp.com/).
4. Open a chat group.
5. Click the `Trivia` button:

![Trivia game for WhatsApp group](misc/button.png)

6. You will see this screen:

![Trivia game for WhatsApp group](misc/ui.png)
   
7. You can change the language between English and Spanish (English is the default language).

![Trivia game for WhatsApp group](misc/ui_lang.png)

8. Enter the questions and answers. Tip: each line break is interpreted as a new question. For example:

![Trivia game for WhatsApp group](misc/ui_example.png)

9. Select the options before starting the game, such as:
- `Tag members` to mention all participants in the group before sending a new question.
- `Nation Order` to organize by nationality (many countries in the Americas are included).
- `Nation Resume` for a breakdown of the percentage each nation represents in the group.
- `Repeat` to repeat all the questions.
- `Randomnize` to shuffle the question order.
- `Correct Answers` is the number of correct answers needed to move to the next question. If the game is stuck because fewer correct answers were received, decrease this number and then restore it once a new question is being prepared to be sent.
- `Enumerate` to number all the questions.
- `Bold` to bold all the questions and text.
- `Italic` to italicize all the questions and text.
- `Uppercase` to convert all the questions and text to uppercase.

About the game:
1. Once the game begins, this script counts correct answers. The first correct answer earns [`Correct Answers` number + 2] points, and subsequent correct responses earn [`Correct Answers` number + 1] points.
2. When the required number of correct answers is reached, the scoreboard is displayed. When the game ends, the final scoreboard is shown.
3. Warn your players that it is possible for two or more responses to arrive at the same time, and the script might not detect them. If this happens, players should resend their responses. However, if the script displays `response detected`, no further action is required from the player.
5. Players can make as many attempts as they want, but warn them that each wrong response reduces their points by 1.

## v1.12 update

Since version 1.12, you will have two buttons: one to tag group members at any time (especially before the game starts) and another to skip the current question (for instance, if players are not responding to the question, you can skip it):

![Trivia game for WhatsApp group](misc/ui_1.12.png)

If you like this project and want to support it, please consider making a donation:
[![Donate](https://raw.githubusercontent.com/stefan-niedermann/paypal-donate-button/master/paypal-donate-button.png)](https://paypal.me/DrSigilo?country.x=MX&locale.x=es_XC)

Have a good game!


