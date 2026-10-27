/* Screenshot coordinates are percentages of the original 1320 × 2868 image. */
(() => {
  'use strict';

  window.SudokuAnatomyScreens = {
    board: [
      {
        title: '进度条',
        text: '记录落子进度；拖动可回看并恢复到已经走过的位置。',
        anchor: [50, 14.7],
        bounds: [2.1, 13.4, 95.2, 2.6],
        side: 'left',
        position: 12
      },
      {
        title: '计时',
        text: '看见这一局花了多久，按自己的节奏继续。',
        anchor: [50.4, 19.2],
        bounds: [44.4, 18.3, 11.2, 1.8],
        side: 'right',
        position: 18
      },
      {
        title: '暂停',
        text: '暂时离开这一局，让计时与盘面一同停下。',
        anchor: [7.8, 19.3],
        bounds: [3.4, 17.3, 8.7, 4],
        side: 'left',
        position: 30
      },
      {
        title: '难度',
        text: '在五档难度之间选择适合自己的题目。',
        anchor: [90.4, 19.2],
        bounds: [86.4, 18.3, 10.8, 1.8],
        side: 'right',
        position: 36
      },
      {
        title: '题目出处',
        text: '保留题目来源与评级，方便认识和查找这道题。',
        anchor: [50, 23.1],
        bounds: [24, 22.5, 52, 1.2],
        side: 'left',
        position: 47
      },
      {
        title: '九宫格盘面',
        text: '用层级、高亮与字形区分条件、选择和自己的填写。',
        anchor: [50, 46],
        bounds: [2.7, 24.3, 94.6, 43.5],
        side: 'right',
        position: 58
      },
      {
        title: '解题工具',
        text: '把撤销、候选笔记等常用操作放在盘面附近。',
        anchor: [61.8, 73.6],
        bounds: [8.6, 70.9, 82.8, 5.5],
        side: 'left',
        position: 75
      },
      {
        title: '数字键盘',
        text: '选定格子后填写数字，或切换为候选记录。',
        anchor: [50, 83.3],
        bounds: [2.7, 79.5, 94.6, 7.7],
        side: 'right',
        position: 88
      }
    ],
    coach: [
      {
        title: '观察范围',
        text: '高亮相关区域，把注意力带到这一步需要检查的位置。',
        anchor: [50, 50.9],
        bounds: [2.7, 48.4, 94.6, 5.0],
        side: 'left',
        position: 30
      },
      {
        title: '技法名称',
        text: '标明这一步使用的解题方法。',
        anchor: [14.6, 74.4],
        bounds: [4.6, 73.4, 22.6, 1.7],
        side: 'right',
        position: 58
      },
      {
        title: '观察提示',
        text: '在进一步解释之前，留出自己判断的机会。',
        anchor: [48, 83.6],
        bounds: [4.5, 77.6, 91.2, 9],
        side: 'left',
        position: 83
      },
      {
        title: '指导进度',
        text: '三个圆点标示指导步骤。',
        anchor: [91.4, 77.4],
        bounds: [87.4, 77, 8.4, 0.8],
        side: 'right',
        position: 87
      },
      {
        title: '返回解题',
        text: '收起卡片，回到盘面亲手完成这一格。',
        anchor: [90.4, 74.2],
        bounds: [86.4, 72.3, 8.2, 4],
        side: 'left',
        position: 59
      }
    ],
    settings: [
      {
        title: '对局规则',
        text: '调整一局的规则与反馈方式。',
        anchor: [48, 23.7],
        bounds: [7.5, 20.2, 85, 7],
        side: 'left',
        position: 20
      },
      {
        title: '盘面辅助',
        text: '选择高亮、候选和手势等辅助偏好。',
        anchor: [48, 30.4],
        bounds: [7.5, 27.5, 85, 6.4],
        side: 'right',
        position: 32
      },
      {
        title: '导师设置',
        text: '选择合适的辅导方式。',
        anchor: [48, 37],
        bounds: [7.5, 34.3, 85, 6.4],
        side: 'left',
        position: 43
      },
      {
        title: '外观偏好',
        text: '调整主题与盘面外观，让长时间观察更合习惯。',
        anchor: [48, 58.7],
        bounds: [7.5, 55.5, 85, 6.4],
        side: 'right',
        position: 59
      },
      {
        title: '玩家署名',
        text: '为分享给朋友的题目留下自己的名字。',
        anchor: [48, 79.8],
        bounds: [7.5, 76.4, 85, 6.4],
        side: 'left',
        position: 80
      },
      {
        title: '底部导航',
        text: '在记录、残局、教程与设置之间切换。',
        anchor: [50, 94.4],
        bounds: [5, 91.3, 90, 6.4],
        side: 'right',
        position: 91
      }
    ],
    classics: [
      {
        title: '经典名题',
        text: '集中浏览已有的经典题目。',
        anchor: [24, 11],
        bounds: [4.5, 9.4, 55, 5.4],
        side: 'left',
        position: 12
      },
      {
        title: '题目列表',
        text: '选择一道题，进入对应盘面。',
        anchor: [23, 26],
        bounds: [4.5, 23, 91, 7.5],
        side: 'right',
        position: 28
      },
      {
        title: '难度与出处',
        text: '了解题目的挑战程度与来源。',
        anchor: [26, 36.1],
        bounds: [4.5, 35.4, 43, 1.4],
        side: 'left',
        position: 43
      },
      {
        title: '历史渊源',
        text: '认识题目背后的作者与故事。',
        anchor: [85.8, 42.1],
        bounds: [83.6, 41.2, 4.4, 1.8],
        side: 'right',
        position: 56
      },
      {
        title: '分步解法',
        text: '从题目进入逐步推演的过程。',
        anchor: [74.8, 57.6],
        bounds: [72.6, 56.7, 4.5, 1.8],
        side: 'left',
        position: 72
      }
    ],
    walkthrough: [
      {
        title: '题目与评级',
        text: '确认正在研究的题目。',
        anchor: [30, 12.4],
        bounds: [4.5, 10.2, 67, 4.3],
        side: 'left',
        position: 12
      },
      {
        title: '解法盘面',
        text: '随步骤变化，呈现当时的盘面状态。',
        anchor: [50, 34.3],
        bounds: [9.2, 15.5, 81.6, 37.5],
        side: 'right',
        position: 30
      },
      {
        title: '当前步骤',
        text: '说明这一刻正在推进哪一步。',
        anchor: [50, 55.2],
        bounds: [20, 54.3, 60, 1.8],
        side: 'left',
        position: 44
      },
      {
        title: '播放与暂停',
        text: '连续观看，或停下来自己检查。',
        anchor: [9.8, 59.3],
        bounds: [5.7, 57.4, 8, 3.8],
        side: 'right',
        position: 57
      },
      {
        title: '步骤进度',
        text: '在已有解法中选择要研究的位置。',
        anchor: [50, 59.3],
        bounds: [17.5, 58.3, 77, 2.1],
        side: 'left',
        position: 72
      },
      {
        title: '解法说明',
        text: '标明当前技法与落子，超出已有技法的步骤注明「揭晓」。',
        anchor: [50, 63.5],
        bounds: [12, 62.5, 77, 2],
        side: 'right',
        position: 83
      }
    ],
    share: [
      {
        title: '残局预览',
        text: '发送前确认盘面与已经填写的数字。',
        anchor: [50, 67.8],
        bounds: [14.9, 52.1, 70.2, 32.2],
        side: 'left',
        position: 64
      },
      {
        title: '进度摘要',
        text: '看清这一局已经推进到哪里。',
        anchor: [45.3, 87.5],
        bounds: [28.3, 86.8, 32.5, 1.6],
        side: 'right',
        position: 74
      },
      {
        title: '为残局命名',
        text: '留下一个便于识别、也带着个人意味的名字。',
        anchor: [66.8, 87.6],
        bounds: [65.3, 86.9, 3, 1.5],
        side: 'left',
        position: 86
      },
      {
        title: '发送给朋友',
        text: '通过系统分享面板发送，朋友可接着解或先保存。',
        anchor: [50, 92.9],
        bounds: [19.3, 90.8, 61.5, 4.4],
        side: 'right',
        position: 93
      },
      {
        title: '返回对局',
        text: '收起分享界面，继续当前这一局。',
        anchor: [89.1, 48.9],
        bounds: [85.1, 47.1, 7.9, 3.8],
        side: 'left',
        position: 45
      }
    ]
  };

  Object.assign(window.PORTFOLIO_TRANSLATIONS ||= {}, {
    'AI Escargot 的原生分步解法，暂停在第十步': 'The native AI Escargot walkthrough, paused at step ten',
    '把界面展开来看。': 'A closer look at the interface.',
    '选择一个组件，看看它在这一局里做什么。': 'Select a component to see what it does in a game.',
    '进度条': 'Progress strip',
    '左右拖动，逐步回溯或恢复落子。': 'Drag left or right to rewind or restore moves.',
    '暂停': 'Pause',
    '暂停并保留当前进度。': 'Pause and keep the current position.',
    '计时': 'Timer',
    '难度': 'Difficulty',
    '切换对局难度。': 'Change the game difficulty.',
    '题目出处': 'Puzzle source',
    '题库、题号与 SE 评级。': 'Collection, puzzle number and SE rating.',
    '九宫格盘面': 'The nine-by-nine board',
    '区分题目数字、手写填写与候选笔记。': 'Distinguish clues, handwritten entries and candidate notes.',
    '解题工具': 'Solving tools',
    '撤销、擦除、候选笔记与提示。': 'Undo, erase, candidate notes and hints.',
    '数字键盘': 'Number keypad',
    '选择 1—9 填入当前格。': 'Choose 1–9 to fill the selected cell.',
    '观察范围': 'Where to look',
    '高亮相关行与目标格。': 'Highlight the relevant row and target cell.',
    '技法名称': 'Technique name',
    '当前技法：隐性唯一。': 'Current technique: hidden single.',
    '先自己想想': 'Think it through first',
    '对照行、列、宫，排除已有数字。': 'Check the row, column and box to rule out existing digits.',
    '观察提示': 'Observation prompt',
    '先指出值得观察的行，留下独立推理的空间。': 'Point to a row worth observing while leaving room for independent reasoning.',
    '指导进度': 'Guidance progress',
    '四个圆点标示指导步骤。': 'Four dots mark the guidance steps.',
    '三个圆点标示指导步骤。': 'Three dots mark the guidance steps.',
    '返回解题': 'Back to solving',
    '收起指导，继续解题。': 'Close the guidance and continue solving.',
    '对局规则': 'Game rules',
    '纸上模式、错误次数与长按罗盘。': 'Paper mode, mistake limit and long-press dial.',
    '盘面辅助': 'Board assistance',
    '高亮、候选数与剩余计数。': 'Highlights, candidates and remaining counts.',
    '导师设置': 'Coach settings',
    '设置导师模式与引导偏好。': 'Set coach modes and guidance preferences.',
    '外观偏好': 'Appearance preferences',
    '调整计时器、数字字重与信号色。': 'Adjust the timer, digit weight and accent color.',
    '玩家署名': 'Player signature',
    '设置打印凭证上的署名。': 'Set the signature on printed certificates.',
    '底部导航': 'Bottom navigation',
    '切换记录、残局、教程和设置。': 'Switch between records, saved positions, the guide and settings.',
    '经典名题': 'Classic puzzles',
    '内置经典高难题目。': 'A selection of difficult classic puzzles.',
    '题目列表': 'Puzzle list',
    '选择题目，开始大师难度对局。': 'Choose a puzzle to start a Master game.',
    '难度与出处': 'Difficulty and origin',
    'SE 评级、线索数量、作者与年份。': 'SE rating, clue count, author and year.',
    '历史渊源': 'Historical background',
    '了解创作者与题目背景。': 'Learn about the creator and puzzle background.',
    '分步解法': 'Step-by-step solution',
    '逐步查看完整推理。': 'Follow the complete reasoning step by step.',
    '题目与评级': 'Puzzle and rating',
    '原题名称与 SE 评级。': 'The puzzle name and SE rating.',
    '解法盘面': 'Solution board',
    '区分题目数字与解法填写。': 'Distinguish the clues from solution entries.',
    '当前步骤': 'Current step',
    '说明本步技法与落子。': 'Show the technique and placement for this step.',
    '播放与暂停': 'Play and pause',
    '连续观看，或随时暂停。': 'Watch continuously or pause at any time.',
    '步骤进度': 'Step progress',
    '拖动回看步骤与计数。': 'Drag to revisit steps and see the step count.',
    '解法说明': 'Solution explanation',
    '超出现有技法时，明确标注揭晓。': 'Clearly label a reveal when a step goes beyond the supported techniques.',
    '残局预览': 'Position preview',
    '预览原题与当前填写。': 'Preview the clues and current entries.',
    '进度摘要': 'Progress summary',
    '难度与已填格数。': 'Difficulty and filled-cell count.',
    '为残局命名': 'Name the position',
    '修改分享时的残局名称。': 'Edit the name used when sharing.',
    '发送给朋友': 'Send to a friend',
    '打开系统分享菜单。': 'Open the system share menu.',
    '返回对局': 'Back to the game',
    '关闭分享，继续当前对局。': 'Close sharing and continue the current game.'
  });
})();
