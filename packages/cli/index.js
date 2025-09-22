#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000
});

async function checkAPIConnection() {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    return null;
  }
}

async function displayHeader() {
  console.clear();
  console.log(chalk.bold.cyan('===================================================='));
  console.log(chalk.bold.cyan('|') + chalk.bold.white('     WINDO - AI Educational Simulation Platform    ') + chalk.bold.cyan('|'));
  console.log(chalk.bold.cyan('|') + chalk.gray('     Teaching Critical Thinking Through AI         ') + chalk.bold.cyan('|'));
  console.log(chalk.bold.cyan('===================================================='));
  console.log();
}

async function mainMenu() {
  const choices = [
    { name: chalk.green('[P] Professor Setup'), value: 'professor_setup' },
    { name: chalk.yellow('[S] Student Experience'), value: 'student_experience' },
    { name: chalk.magenta('[E] Edit Mode'), value: 'edit_mode' },
    { name: chalk.blue('[V] View State'), value: 'view_state' },
    { name: chalk.cyan('[X] Export Simulation'), value: 'export' },
    { name: chalk.red('[C] Clear Simulation'), value: 'clear' },
    { name: chalk.gray('Exit'), value: 'exit' }
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices
    }
  ]);

  return action;
}

async function professorSetup() {
  console.log(chalk.green.bold('\n[Professor Setup Mode]\n'));
  console.log(chalk.gray('Create a new simulation by providing the scenario and AI behavior instructions.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'editor',
      name: 'scenario',
      message: 'Enter the scenario/case study (opens in editor):',
      validate: (input) => input.trim() ? true : 'Scenario cannot be empty'
    },
    {
      type: 'editor',
      name: 'instructions',
      message: 'Enter AI behavior instructions (opens in editor):',
      validate: (input) => input.trim() ? true : 'Instructions cannot be empty'
    }
  ]);

  try {
    const response = await apiClient.post('/professor/setup', {
      scenario: answers.scenario,
      instructions: answers.instructions
    });

    console.log(chalk.green('\n✓ Simulation created successfully!'));
    console.log(chalk.gray(`Simulation ID: ${response.data.simulationId}`));

    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }]);
  } catch (error) {
    console.log(chalk.red('\n✗ Error creating simulation:'));
    console.log(chalk.red(error.response?.data?.error || error.message));
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }]);
  }
}

async function studentExperience() {
  console.log(chalk.yellow.bold('\n[Student Experience Mode]\n'));

  try {
    const stateResponse = await apiClient.get('/simulation/state');
    const state = stateResponse.data;

    if (!state.scenario) {
      console.log(chalk.red('No simulation is currently set up. Please ask your professor to set up the simulation first.'));
      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...'
      }]);
      return;
    }

    console.log(chalk.gray('Scenario Preview:'));
    console.log(chalk.white(state.scenario.substring(0, 500)));
    if (state.scenario.length > 500) {
      console.log(chalk.gray('... (truncated)'));
    }
    console.log();

    if (state.conversationHistory.length > 0) {
      console.log(chalk.gray('\n-- Previous conversation:'));
      state.conversationHistory.slice(-3).forEach(entry => {
        const prefix = entry.role === 'student' ? chalk.yellow('Student:') : chalk.cyan('AI Advisor:');
        console.log(`${prefix} ${entry.content.substring(0, 200)}`);
        if (entry.content.length > 200) console.log(chalk.gray('...'));
      });
      console.log();
    }

    console.log(chalk.gray('Tip: Type your response or "exit" to return to menu\n'));

    let continueConversation = true;
    while (continueConversation) {
      const { studentInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'studentInput',
          message: chalk.yellow('Your response:'),
          validate: (input) => input.trim() ? true : 'Please enter a response'
        }
      ]);

      if (studentInput.toLowerCase() === 'exit' || studentInput.toLowerCase() === 'quit') {
        continueConversation = false;
        break;
      }

      try {
        console.log(chalk.gray('\n... AI Advisor is thinking...\n'));
        const response = await apiClient.post('/student/respond', { studentInput });

        console.log(chalk.cyan('AI Advisor:'), response.data.response);
        console.log();
      } catch (error) {
        console.log(chalk.red('\n✗ Error:'), error.response?.data?.error || error.message);
      }
    }
  } catch (error) {
    console.log(chalk.red('\n✗ Error accessing simulation:'));
    console.log(chalk.red(error.response?.data?.error || error.message));
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }]);
  }
}

async function editMode() {
  console.log(chalk.magenta.bold('\n[Edit Mode]\n'));
  console.log(chalk.gray('Modify the current simulation scenario or AI instructions.\n'));

  try {
    const stateResponse = await apiClient.get('/simulation/state');
    const state = stateResponse.data;

    console.log(chalk.gray('Current Scenario (first 300 chars):'));
    console.log(state.scenario.substring(0, 300) + (state.scenario.length > 300 ? '...' : ''));
    console.log();
    console.log(chalk.gray('Current Instructions (first 300 chars):'));
    console.log(state.instructions.substring(0, 300) + (state.instructions.length > 300 ? '...' : ''));
    console.log();

    const { editChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'editChoice',
        message: 'What would you like to edit?',
        choices: [
          { name: 'Edit Scenario', value: 'scenario' },
          { name: 'Edit Instructions', value: 'instructions' },
          { name: 'Edit Both', value: 'both' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (editChoice === 'cancel') return;

    const updates = {};

    if (editChoice === 'scenario' || editChoice === 'both') {
      const { newScenario } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'newScenario',
          message: 'Enter new scenario:',
          default: state.scenario,
          validate: (input) => input.trim() ? true : 'Scenario cannot be empty'
        }
      ]);
      updates.scenario = newScenario;
    }

    if (editChoice === 'instructions' || editChoice === 'both') {
      const { newInstructions } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'newInstructions',
          message: 'Enter new instructions:',
          default: state.instructions,
          validate: (input) => input.trim() ? true : 'Instructions cannot be empty'
        }
      ]);
      updates.instructions = newInstructions;
    }

    const response = await apiClient.patch('/professor/edit', updates);
    console.log(chalk.green('\n✓ Simulation updated successfully!'));

    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }]);
  } catch (error) {
    console.log(chalk.red('\n✗ Error:'));
    console.log(chalk.red(error.response?.data?.error || error.message));
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }]);
  }
}

async function viewState() {
  console.log(chalk.blue.bold('\n[Current Simulation State]\n'));

  try {
    const response = await apiClient.get('/simulation/state');
    const state = response.data;

    console.log(chalk.gray('Simulation ID:'), state.simulationId);
    console.log(chalk.gray('Created:'), new Date(state.createdAt).toLocaleString());
    console.log(chalk.gray('Last Modified:'), new Date(state.lastModified).toLocaleString());
    console.log(chalk.gray('Messages:'), state.messageCount);
    console.log();

    console.log(chalk.gray('Scenario:'));
    console.log(state.scenario.substring(0, 500));
    if (state.scenario.length > 500) console.log(chalk.gray('... (truncated)'));
    console.log();

    console.log(chalk.gray('Instructions:'));
    console.log(state.instructions.substring(0, 500));
    if (state.instructions.length > 500) console.log(chalk.gray('... (truncated)'));
    console.log();

    if (state.conversationHistory.length > 0) {
      console.log(chalk.gray('Recent Conversation (last 3 messages):'));
      state.conversationHistory.slice(-3).forEach(entry => {
        const prefix = entry.role === 'student' ? chalk.yellow('Student:') : chalk.cyan('AI Advisor:');
        console.log(`${prefix} ${entry.content.substring(0, 200)}`);
        if (entry.content.length > 200) console.log(chalk.gray('...'));
        console.log();
      });
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(chalk.yellow('No active simulation found.'));
    } else {
      console.log(chalk.red('Error:'), error.response?.data?.error || error.message);
    }
  }

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...'
  }]);
}

async function exportSimulation() {
  console.log(chalk.cyan.bold('\n[Export Simulation]\n'));

  try {
    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Select export format:',
        choices: [
          { name: 'JSON (structured data)', value: 'json' },
          { name: 'Text (readable format)', value: 'text' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (format === 'cancel') return;

    const response = await apiClient.get('/simulation/export', {
      params: { format },
      responseType: format === 'text' ? 'text' : 'json'
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `windo-export-${timestamp}.${format === 'text' ? 'txt' : 'json'}`;

    if (format === 'text') {
      await fs.writeFile(filename, response.data);
    } else {
      await fs.writeFile(filename, JSON.stringify(response.data, null, 2));
    }

    console.log(chalk.green(`\n✓ Simulation exported to ${filename}`));
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(chalk.yellow('No active simulation to export.'));
    } else {
      console.log(chalk.red('Error:'), error.response?.data?.error || error.message);
    }
  }

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...'
  }]);
}

async function clearSimulation() {
  console.log(chalk.red.bold('\n[Clear Simulation]\n'));

  try {
    const { clearChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'clearChoice',
        message: 'What would you like to clear?',
        choices: [
          { name: 'Clear conversation history only', value: 'conversation' },
          { name: 'Clear entire simulation', value: 'all' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (clearChoice === 'cancel') return;

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('Are you sure? This cannot be undone.'),
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Clear operation cancelled.'));
      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...'
      }]);
      return;
    }

    const params = clearChoice === 'conversation' ? { conversation: 'true' } : { all: 'true' };
    const response = await apiClient.delete('/simulation/clear', { params });

    console.log(chalk.green(`\n✓ ${response.data.message}`));
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(chalk.yellow('No active simulation to clear.'));
    } else {
      console.log(chalk.red('Error:'), error.response?.data?.error || error.message);
    }
  }

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...'
  }]);
}

async function main() {
  await displayHeader();

  const apiStatus = await checkAPIConnection();
  if (!apiStatus) {
    console.log(chalk.red.bold('! Cannot connect to API server!'));
    console.log(chalk.yellow('\nPlease ensure the API server is running:'));
    console.log(chalk.gray('  npm run api     (from project root)'));
    console.log(chalk.gray('  npm run dev     (to run both API and CLI)'));
    console.log();

    const { retry } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Would you like to retry?',
        default: true
      }
    ]);

    if (retry) {
      return main();
    } else {
      process.exit(0);
    }
  }

  console.log(chalk.green('✓ Connected to API server'));
  if (apiStatus.hasActiveSimulation) {
    console.log(chalk.gray('   Active simulation detected'));
  }
  console.log();

  let shouldExit = false;

  while (!shouldExit) {
    await displayHeader();
    const action = await mainMenu();

    switch (action) {
      case 'professor_setup':
        await professorSetup();
        break;
      case 'student_experience':
        await studentExperience();
        break;
      case 'edit_mode':
        await editMode();
        break;
      case 'view_state':
        await viewState();
        break;
      case 'export':
        await exportSimulation();
        break;
      case 'clear':
        await clearSimulation();
        break;
      case 'exit':
        shouldExit = true;
        break;
    }
  }

  console.log(chalk.cyan('\nThank you for using Windo!'));
  console.log(chalk.gray('Teaching critical thinking through AI-powered simulations.\n'));
  process.exit(0);
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});