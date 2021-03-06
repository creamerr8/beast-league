'use strict';
/* global MonsterBattler, getRandomMonster, AbilityDatabase, renderHealthBars, renderMonsterStats, renderBattleSprites, enableAbilityTray, disableAbilityTray, renderTurn, updateHealthBars, updateMonsterStats */
/* eslint-disable no-unused-vars */


// This is going to contain the core gameplay loop for combat
/*
  >> Initialize loop: Get random monster and get player monster data
  >> Game loop: On ability input, do the following
    1. Roll turn order; 1-100 plus Speed
    2. Perform first acting battler's action
      a. Inflict effects, queue render animations for each effect
      c. Update enemy values; if dead, can't act this turn and queues death animation
    3. Perform second acting battler's action
      a. Repeat from (2)
    4. Render animations
      a. In gameview.js, renders animations in the order that they are placed in the render queue
      b.
*/

var userBattleContainer = document.getElementById('userBattleContainer');
var enemyBattleContainer = document.getElementById('enemyBattleContainer');
var userMonster, enemyMonster, userScore, startCombat, turnTimer = 0;

function initializeCombat() {
  if (document.getElementById('gameStartButton')) {
    var startButton = document.getElementById('gameStartButton');
    startButton.remove();
  }
  if (localStorage.getItem('userMonster')) {
    userMonster = new MonsterBattler(JSON.parse(localStorage.getItem('userMonster')));
  } else {
    userMonster = new MonsterBattler(getRandomMonster());
    localStorage.setItem('userMonster', JSON.stringify(userMonster));
  }



  // Instantiate enemy monster
  enemyMonster = new MonsterBattler(getRandomMonster());

  while (enemyMonster.monsterData.name === userMonster.monsterData.name) {
    enemyMonster = new MonsterBattler(getRandomMonster());
  }

  // Assigns effective stat values and abilities for both battlers
  enemyMonster.currentHealth = enemyMonster.maximumHealth;
  enemyMonster.currentAttack = enemyMonster.monsterData.attack;
  enemyMonster.currentDefense = enemyMonster.monsterData.defense;
  enemyMonster.currentSpeed = enemyMonster.monsterData.speed;
  for (var i in enemyMonster.monsterData.abilitySet) {
    enemyMonster.abilitySet.push(AbilityDatabase[enemyMonster.monsterData.abilitySet[i]]);
  }

  userMonster.currentHealth = userMonster.maximumHealth;
  userMonster.currentAttack = userMonster.monsterData.attack;
  userMonster.currentDefense = userMonster.monsterData.defense;
  userMonster.currentSpeed = userMonster.monsterData.speed;
  for (var j in userMonster.monsterData.abilitySet) {
    userMonster.abilitySet.push(AbilityDatabase[userMonster.monsterData.abilitySet[j]]);

  }

  // Sets battler targets
  enemyMonster.target = userMonster;
  userMonster.target = enemyMonster;

  var directionSection = document.getElementById('directionSection');
  var directions = document.createElement('h1');
  directions.textContent = 'Press a number on the keyboard to choose an attack. View each monster\'s current stats below.';
  directions.className = 'directions';
  directionSection.appendChild(directions);

  // Create health bars and battle positions at start
  renderHealthBars();
  renderMonsterStats();

  renderBattleSprites(userMonster.monsterData.imgSrc, enemyMonster.monsterData.imgSrc);
  enableAbilityTray();
}

function executeTurn(abilitySel) {
  disableAbilityTray();

  // Sets monster's next action to take
  userMonster.nextAction = userMonster.abilitySet[abilitySel];
  enemyMonster.nextAction = enemyMonster.abilitySet[Math.round(Math.floor(Math.random() * enemyMonster.abilitySet.length))];

  // Each battler rolls initiative and their turn order is placed
  var firstBattler, secondBattler;
  userMonster.initiativeRoll = rollInitiative(userMonster.currentSpeed)  + userMonster.nextAction.spdMod;
  enemyMonster.initiativeRoll = rollInitiative(enemyMonster.currentSpeed)  + enemyMonster.nextAction.spdMod;
  console.log(userMonster.monsterData.name + ' rolled ' + userMonster.initiativeRoll);
  console.log(enemyMonster.monsterData.name + ' rolled ' + enemyMonster.initiativeRoll);

  if (userMonster.initiativeRoll >= enemyMonster.initiativeRoll) {
    firstBattler = userMonster;
    secondBattler = enemyMonster;
  } else {
    firstBattler = enemyMonster;
    secondBattler = userMonster;
  }

  // Each battler takes their turn; no turns are taken if either battler is defeated
  if (!firstBattler.isDefeated && !secondBattler.isDefeated) {
    addDialogueBoxEntry('p' , '===' + firstBattler.monsterData.name + '\'s Turn ===');
    firstBattler.applyPersistentEffects();
    if (!firstBattler.isStunned) firstBattler.nextAction.execute(firstBattler);
    else addDialogueBoxEntry('p', firstBattler.monsterData.name + ' is stunned!');
    firstBattler.tickConditions(firstBattler);
  }

  if (!firstBattler.isDefeated && !secondBattler.isDefeated) {
    addDialogueBoxEntry('p' , '===' + secondBattler.monsterData.name + '\'s Turn ===');
    secondBattler.applyPersistentEffects();
    if (!secondBattler.isStunned) secondBattler.nextAction.execute(secondBattler);
    else addDialogueBoxEntry('p' , secondBattler.monsterData.name + ' is stunned!');
    secondBattler.tickConditions(secondBattler);
  }

  updateHealthBars();
  updateMonsterStats();
  renderTurn();
}

// Rolls initiative and passes back speed value
function rollInitiative(speedValue) {
  var randomRoll = Math.round(Math.floor(Math.random() * 100) + speedValue);
  return randomRoll;
}
function userAttack(event) {
  if (event.keyCode === 97 || event.keyCode === 49) {
    turnTimer++;
    dialogueBox(turnTimer);
    executeTurn(0);
  } else if (event.keyCode === 98 || event.keyCode === 50) {
    turnTimer++;
    dialogueBox(turnTimer);
    executeTurn(1);
  } else if (event.keyCode === 99 || event.keyCode === 51) {
    turnTimer++;
    dialogueBox(turnTimer);
    executeTurn(2);
  } else if (event.keyCode === 100 || event.keyCode === 52) {
    turnTimer++;
    dialogueBox(turnTimer);
    executeTurn(3);
  }
}

// This function is to render the dialogue box to the screen each turn, it is called in the userAttack function
var dialogueBoxEl = document.getElementById('dialogueTrayDiv');
var dialogueUlEl = document.createElement('ul');
var currentDialogueLiEl;
function dialogueBox(turnNumber) {
  dialogueBoxEl.appendChild(dialogueUlEl);
  // This is all placed in one list item so that we can control where in the list it is placed with the insertBefore method at the end of this function
  currentDialogueLiEl = document.createElement('li');
  var headerEl = document.createElement('h3');
  headerEl.textContent = 'Round ' + turnNumber;
  currentDialogueLiEl.appendChild(headerEl);
  // Place the new item at the top of the list, this came from W3 schools on the insertBefore method
  dialogueUlEl.insertBefore(currentDialogueLiEl, dialogueUlEl.childNodes[0]);
}

function addDialogueBoxEntry(element, text) {
  var newEntryEl = document.createElement(element);
  newEntryEl.textContent = text;
  currentDialogueLiEl.appendChild(newEntryEl);
}
