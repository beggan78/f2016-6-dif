#### DIF F16-6 Game App

I need a mobile-first webapp for my soccer team that I'm coaching. Every game is played in 3 periods. Every period is 15 minutes long. The whole team has 14 players but for one and the same game 7 players are elected.
These are the players on the team:
"Alma",
"Ebba",
"Elise",
"Filippa",
"Fiona",
"Ines",
"Isabelle",
"Julie",
"Leonie",
"Nicole",
"Rebecka",
"Sigrid",
"Sophie",
"Tyra"

The games are played 5 against 5 players. One team has one goalie, two defenders and two attackers on the field during play. So there are 2 substitutes at all times. Unless the goalie gets injured or similar, the goalie will play one period without getting substituted. The 6 outfield players are divided up in pairs where one player plays defense and one plays attacker for one whole period. For the pairs on the field, one pair plays left and one plays right. The players are substituted roughly every two minutes on a round robin schedule. Between periods it is possible to change goalie so that one of the outfielders from the first period is goaltending in the second period. The player that is no longer goaltending is paired up with the outfielder from the broken-up pair.

During the game it's sometimes difficult to keep track of the time when it's time to substitute players. It can also be hard to remember which two players are to be substituted when it's time.

I therefore need a mobile friendly app that can help me keep track of these things.

## Game and squad configuration
Before a game there should be an easy way to select the 7 players that are playing the game of the day out of the roster of 14 players. It should also be possible to specify the number of periods and the length of each period. Options for number of periods are 1, 2 or 3. Preselected value should be “3”. Options for period duration should be 10, 15, 20, 25 or 30 minutes. Preselected value is 15.

Before the match It should be possible to select a goalie for each of the 3 periods. It must be possible to later make changes as to who is goaltending.

## Team selection
Before the first period it should be easy to select which players are paired up and to select which player in the pair is the defender and who is attacker. It should also be possible to select a goalie and which pair starts the game as substitutes. Before any period there are three pairs. Left, Right and substitutes. Try to avoid unnecessary clicks from the user. In the Team selection phase all the the user should have to select is a player for each position. It should be clear, for example, which drop-down is for Left defender.

After the players have been assigned their positions for the period it must be possible to to start the match.

## During a period
There should be two timers visible. One is counting down from 15 minutes. This is the match clock. The other timer is counting up from zero and is reset when there's a substitution. This is the substitution timer.

The app should make it visually clear which pairs are currently on the field. Both elements with the pairs currently on the field have the same blue color. It should also be visually clear which pair is next up to leave the field to become substitutes. This part is important as the user needs it to be clear which players I should call out to come off the field. As soon as the period is started the user needs to be able to tell which pair is to be substituted next.  Green up-arrows means that the players are to go on the the field and red down-arrows mean that the players are next to leave the field. There is a button to indicate that the planned substitution took place. For the first substitution the substitute pair is switched with the left pair. In the following substitution the new substitute pair is switched with the right pair. So it continues in a round-robin fashion. When the substitute button is clicked the substitution timer is reset.

There should also be a button for ending the period. Since it is a referee that calls the end of the period it could be shorter or longer than 15 minutes.

## Keeping track of stats
The app also keeps track of the time each individual player has spent on the field and how much time they spent as substitutes.  When a new period is set up the app recommends that “the pair with the one player who has had the most time as outfielders so far in the match” start the period as substitutes. First pair to come off the field in the first substitution in the 2nd and 3rd period is “the pair recommended to not start as substitutes with the player who has had the most time as outfielder so far in the match. The recommendation for the pair starting as substitutes and the pair recommended to be the first to rotate can not be the same pair.
The recommended team setup is preselected but can be changed by the user.
Then substitutions continue in a round-robin fashion.

Before the next period starts, the app should suggest new positions for the players. The goalie selected before the match for the given period is preselected. If none of the players in a pair is to play goalie in the next period, the pair should remain intact. However, the defender and attacker roles are switched in the pair between periods. The goalie from the previous period replaces the player in the pair that is to play goalie in the next period.

## Game stats
After the match is finished some statistics should be clear from the game.
In a table format it should be displayed:
Each player's name
How the player started the match (M = Goalie, S = On field, A = As substitute)
Number of periods as goalie: (0, 1, 2 or 3)
Number of periods as defender: (0, 1, 2 or 3)
Number of periods as attacker: (0, 1, 2 or 3)

It's important that the app is easy to use from a mobile browser. You are a master at elegant designs. You use icons only where appropriate to represent different concepts. The color scheme is elegant, tasteful and professional. Do not use too many different colors. Let the predominant colors be different shades of blue. Prefer text to be blue on a dark deep blue background. Prefer darker shades of blue rather than light blue (except for texts and symbols that should be mainly light blue). Players’ names are always spelled out. Never abbreviated. 
