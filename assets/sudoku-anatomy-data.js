/* Screenshot coordinates are percentages of the original 1320 × 2868 image. */
(() => {
  'use strict';

  window.SudokuAnatomyScreens = {
    board: [
      {
        title: '对局状态',
        text: '将暂停、计时与难度放在盘面上方，随时掌握当前对局。',
        anchor: [91, 19.2],
        bounds: [3.2, 17.3, 94, 4],
        side: 'left',
        position: 18
      },
      {
        title: '题目出处',
        text: '保留题库名称、题号与 SE 评级，让题目具有清楚的来源。',
        anchor: [50, 23.1],
        bounds: [24, 22.5, 52, 1.2],
        side: 'right',
        position: 26
      },
      {
        title: '九宫格盘面',
        text: '用较淡的单元格线和较清楚的宫线，帮助辨认行、列与宫。',
        anchor: [50, 46],
        bounds: [2.7, 24.3, 94.6, 43.5],
        side: 'left',
        position: 48
      },
      {
        title: '解题工具',
        text: '将撤销、擦除、笔记与提示集中在盘面下方。',
        anchor: [61.8, 73.6],
        bounds: [8.6, 70.9, 82.8, 5.5],
        side: 'right',
        position: 73
      },
      {
        title: '数字键盘',
        text: '以独立按键排列 1—9，让填数与盘面保持直接对应。',
        anchor: [50, 83.3],
        bounds: [2.7, 79.5, 94.6, 7.7],
        side: 'left',
        position: 86
      }
    ],
    coach: [
      {
        title: '观察范围',
        text: '高亮相关行与目标格，将注意力引向需要观察的位置。',
        anchor: [81.6, 31.6],
        bounds: [2.7, 28.9, 94.6, 5.3],
        side: 'left',
        position: 30
      },
      {
        title: '技法名称',
        text: '明确标出当前使用的“隐性唯一”技法。',
        anchor: [14.6, 74.4],
        bounds: [4.6, 73.4, 22.6, 1.7],
        side: 'right',
        position: 58
      },
      {
        title: '先自己想想',
        text: '先提示观察与排除的方法，为玩家保留自行推理的空间。',
        anchor: [48, 83.6],
        bounds: [4.5, 77.6, 91.2, 9],
        side: 'left',
        position: 83
      },
      {
        title: '指导进度',
        text: '用四个圆点标示当前所在的指导步骤。',
        anchor: [91.4, 77.4],
        bounds: [87.4, 77, 8.4, 0.8],
        side: 'right',
        position: 87
      },
      {
        title: '返回解题',
        text: '通过关闭入口收起指导，继续观察与填写盘面。',
        anchor: [90.4, 74.2],
        bounds: [86.4, 72.3, 8.2, 4],
        side: 'left',
        position: 59
      }
    ],
    settings: [
      {
        title: '对局规则',
        text: '集中调整纸上模式、错误次数与长按罗盘。',
        anchor: [48, 23.7],
        bounds: [7.5, 20.2, 85, 7],
        side: 'left',
        position: 20
      },
      {
        title: '盘面辅助',
        text: '选择高亮、候选数与剩余计数等辅助方式。',
        anchor: [48, 30.4],
        bounds: [7.5, 27.5, 85, 6.4],
        side: 'right',
        position: 32
      },
      {
        title: '导师设置',
        text: '集中管理导师模式与引导偏好。',
        anchor: [48, 37],
        bounds: [7.5, 34.3, 85, 6.4],
        side: 'left',
        position: 43
      },
      {
        title: '外观偏好',
        text: '调整计时器、数字字重与信号色，让信息适合自己的阅读习惯。',
        anchor: [48, 58.7],
        bounds: [7.5, 55.5, 85, 6.4],
        side: 'right',
        position: 59
      },
      {
        title: '玩家署名',
        text: '设置打印凭证上使用的名字。',
        anchor: [48, 79.8],
        bounds: [7.5, 76.4, 85, 6.4],
        side: 'left',
        position: 80
      },
      {
        title: '底部导航',
        text: '以记录、残局、教程和设置四个入口组织扩展功能。',
        anchor: [50, 94.4],
        bounds: [5, 91.3, 90, 6.4],
        side: 'right',
        position: 91
      }
    ],
    classics: [
      {
        title: '经典名题',
        text: '从精选的高难残局进入数独历史中的代表题目。',
        anchor: [24, 11],
        bounds: [4.5, 9.4, 55, 5.4],
        side: 'left',
        position: 12
      },
      {
        title: '题目列表',
        text: '以题目名称组织列表，便于浏览与选择挑战。',
        anchor: [23, 26],
        bounds: [4.5, 23, 91, 7.5],
        side: 'right',
        position: 28
      },
      {
        title: '难度与出处',
        text: '在名称下保留 SE 评级、线索数量、作者与年份。',
        anchor: [26, 36.1],
        bounds: [4.5, 35.4, 43, 1.4],
        side: 'left',
        position: 43
      },
      {
        title: '历史渊源',
        text: '查看每道经典名题的创作者、诞生背景与历史故事。',
        anchor: [85.8, 42.1],
        bounds: [83.6, 41.2, 4.4, 1.8],
        side: 'right',
        position: 56
      },
      {
        title: '分步解法',
        text: '逐步查看这道经典名题的完整推理过程。',
        anchor: [74.8, 57.6],
        bounds: [72.6, 56.7, 4.5, 1.8],
        side: 'left',
        position: 72
      }
    ],
    share: [
      {
        title: '残局预览',
        text: '分享前先呈现当前盘面，保留原题与已经填写的数字。',
        anchor: [50, 67.8],
        bounds: [14.9, 52.1, 70.2, 32.2],
        side: 'left',
        position: 64
      },
      {
        title: '进度摘要',
        text: '以难度和已填格数，说明这局残局进行到哪里。',
        anchor: [45.3, 87.5],
        bounds: [28.3, 86.8, 32.5, 1.6],
        side: 'right',
        position: 74
      },
      {
        title: '为残局命名',
        text: '给即将分享的这局残局起一个名字。',
        anchor: [66.8, 87.6],
        bounds: [65.3, 86.9, 3, 1.5],
        side: 'left',
        position: 86
      },
      {
        title: '发送给朋友',
        text: '用一个明确的主按钮完成分享。',
        anchor: [50, 92.9],
        bounds: [19.3, 90.8, 61.5, 4.4],
        side: 'right',
        position: 93
      },
      {
        title: '返回对局',
        text: '关闭分享面板，回到仍在进行的对局。',
        anchor: [89.1, 48.9],
        bounds: [85.1, 47.1, 7.9, 3.8],
        side: 'left',
        position: 45
      }
    ]
  };

  Object.assign(window.PORTFOLIO_TRANSLATIONS ||= {}, {
    '把界面展开来看。': 'A closer look at the interface.',
    '选择一个组件，看看它在这一局里做什么。': 'Select a component to see what it does in a game.',
    '对局状态': 'Game status',
    '将暂停、计时与难度放在盘面上方，随时掌握当前对局。': 'Pause, time and difficulty sit above the board to keep the current game in view.',
    '题目出处': 'Puzzle source',
    '保留题库名称、题号与 SE 评级，让题目具有清楚的来源。': 'The collection name, puzzle number and SE rating keep each puzzle traceable.',
    '九宫格盘面': 'The nine-by-nine board',
    '用较淡的单元格线和较清楚的宫线，帮助辨认行、列与宫。': 'Lighter cell lines and clearer box boundaries make rows, columns and boxes easy to read.',
    '解题工具': 'Solving tools',
    '将撤销、擦除、笔记与提示集中在盘面下方。': 'Undo, erase, notes and hints are grouped just below the board.',
    '数字键盘': 'Number keypad',
    '以独立按键排列 1—9，让填数与盘面保持直接对应。': 'Separate keys for 1–9 keep number entry directly connected to the board.',
    '观察范围': 'Where to look',
    '高亮相关行与目标格，将注意力引向需要观察的位置。': 'The relevant row and target cell are highlighted to guide attention.',
    '技法名称': 'Technique name',
    '明确标出当前使用的“隐性唯一”技法。': 'The current technique is clearly identified as a hidden single.',
    '先自己想想': 'Think it through first',
    '先提示观察与排除的方法，为玩家保留自行推理的空间。': 'Prompts suggest what to observe and eliminate, leaving room for the player to reason.',
    '指导进度': 'Guidance progress',
    '用四个圆点标示当前所在的指导步骤。': 'Four dots indicate the current step in the guidance.',
    '返回解题': 'Back to solving',
    '通过关闭入口收起指导，继续观察与填写盘面。': 'Close the guidance to return to observing and filling the board.',
    '对局规则': 'Game rules',
    '集中调整纸上模式、错误次数与长按罗盘。': 'Adjust paper mode, the mistake limit and the long-press dial in one place.',
    '盘面辅助': 'Board assistance',
    '选择高亮、候选数与剩余计数等辅助方式。': 'Choose assistance such as highlights, candidates and remaining counts.',
    '导师设置': 'Coach settings',
    '集中管理导师模式与引导偏好。': 'Manage coach modes and guidance preferences in one place.',
    '外观偏好': 'Appearance preferences',
    '调整计时器、数字字重与信号色，让信息适合自己的阅读习惯。': 'Adjust the timer, digit weight and accent color to suit personal reading preferences.',
    '玩家署名': 'Player signature',
    '设置打印凭证上使用的名字。': 'Set the name used on printed certificates.',
    '底部导航': 'Bottom navigation',
    '以记录、残局、教程和设置四个入口组织扩展功能。': 'Records, saved positions, the guide and settings organize the supporting features.',
    '经典名题': 'Classic puzzles',
    '从精选的高难残局进入数独历史中的代表题目。': 'Explore landmark puzzles from Sudoku history through a selection of difficult classics.',
    '题目列表': 'Puzzle list',
    '以题目名称组织列表，便于浏览与选择挑战。': 'Puzzles are listed by name for browsing and choosing a challenge.',
    '难度与出处': 'Difficulty and origin',
    '在名称下保留 SE 评级、线索数量、作者与年份。': 'The SE rating, clue count, author and year appear below each name.',
    '历史渊源': 'Historical background',
    '查看每道经典名题的创作者、诞生背景与历史故事。': 'Discover the creator, background and history of each classic puzzle.',
    '分步解法': 'Step-by-step solution',
    '逐步查看这道经典名题的完整推理过程。': 'Follow the complete reasoning behind this classic puzzle, step by step.',
    '残局预览': 'Position preview',
    '分享前先呈现当前盘面，保留原题与已经填写的数字。': 'Preview the current position before sharing, including the original clues and entered digits.',
    '进度摘要': 'Progress summary',
    '以难度和已填格数，说明这局残局进行到哪里。': 'The difficulty and filled-cell count show how far the game has progressed.',
    '为残局命名': 'Name the position',
    '给即将分享的这局残局起一个名字。': 'Give this position a name before sharing it.',
    '发送给朋友': 'Send to a friend',
    '用一个明确的主按钮完成分享。': 'One clear primary button starts sharing.',
    '返回对局': 'Back to the game',
    '关闭分享面板，回到仍在进行的对局。': 'Close the sharing panel to return to the game in progress.'
  });
})();
