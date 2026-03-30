/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/nara_quest.json`.
 */
export type NaraQuest = {
  "address": "Quest11111111111111111111111111111111111111",
  "metadata": {
    "name": "naraQuest",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "adjustFreeStake",
      "discriminator": [
        21,
        111,
        164,
        64,
        220,
        115,
        26,
        60
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "stakeRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user"
        },
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "delta",
          "type": "i32"
        },
        {
          "name": "reason",
          "type": "string"
        }
      ]
    },
    {
      "name": "claimAirdrop",
      "discriminator": [
        137,
        50,
        122,
        111,
        89,
        254,
        8,
        20
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "winnerRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  119,
                  105,
                  110,
                  110,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "airdropFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  97,
                  105,
                  114,
                  100,
                  114,
                  111,
                  112
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createQuestion",
      "discriminator": [
        222,
        74,
        49,
        30,
        160,
        220,
        179,
        27
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "caller",
          "docs": [
            "Caller: either authority or quest_authority"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "question",
          "type": "string"
        },
        {
          "name": "answerHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "deadline",
          "type": "i64"
        },
        {
          "name": "difficulty",
          "type": "u32"
        }
      ]
    },
    {
      "name": "expandConfig",
      "discriminator": [
        120,
        201,
        195,
        128,
        35,
        202,
        73,
        161
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "additionalSize",
          "type": "u32"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "setAirdropConfig",
      "discriminator": [
        255,
        181,
        252,
        34,
        155,
        230,
        65,
        227
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "airdropAmount",
          "type": "u64"
        },
        {
          "name": "maxAirdropCount",
          "type": "u32"
        }
      ]
    },
    {
      "name": "setQuestAuthority",
      "discriminator": [
        19,
        140,
        189,
        111,
        121,
        111,
        118,
        50
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newQuestAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setQuestInterval",
      "discriminator": [
        69,
        227,
        209,
        29,
        164,
        111,
        166,
        41
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "minQuestInterval",
          "type": "i64"
        }
      ]
    },
    {
      "name": "setRewardConfig",
      "discriminator": [
        163,
        34,
        211,
        14,
        25,
        118,
        181,
        233
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "minRewardCount",
          "type": "u32"
        },
        {
          "name": "maxRewardCount",
          "type": "u32"
        }
      ]
    },
    {
      "name": "setRewardPerShare",
      "discriminator": [
        163,
        41,
        94,
        29,
        221,
        56,
        112,
        60
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "rewardPerShare",
          "type": "u64"
        },
        {
          "name": "extraReward",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setStakeAuthority",
      "discriminator": [
        202,
        75,
        225,
        146,
        240,
        65,
        15,
        60
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newStakeAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setStakeConfig",
      "discriminator": [
        84,
        37,
        76,
        39,
        236,
        111,
        214,
        191
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "bpsHigh",
          "type": "u64"
        },
        {
          "name": "bpsLow",
          "type": "u64"
        },
        {
          "name": "decayMs",
          "type": "i64"
        }
      ]
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "stakeRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "stakeTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "stakeRecord"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "wsolMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "wsolMint",
          "address": "So11111111111111111111111111111111111111112"
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitAnswer",
      "discriminator": [
        221,
        73,
        184,
        157,
        1,
        150,
        231,
        48
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "winnerRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  119,
                  105,
                  110,
                  110,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "stakeRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "stakeTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "stakeRecord"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "wsolMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "wsolMint",
          "address": "So11111111111111111111111111111111111111112"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proofA",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "proofB",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "proofC",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "agent",
          "type": "string"
        },
        {
          "name": "model",
          "type": "string"
        }
      ]
    },
    {
      "name": "transferAuthority",
      "discriminator": [
        48,
        169,
        76,
        72,
        229,
        180,
        55,
        161
      ],
      "accounts": [
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "pool",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "stakeRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "stakeTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "stakeRecord"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "wsolMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "wsolMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "wsolMint",
          "address": "So11111111111111111111111111111111111111112"
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "gameConfig",
      "discriminator": [
        45,
        146,
        146,
        33,
        170,
        69,
        96,
        133
      ]
    },
    {
      "name": "pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      "name": "stakeRecord",
      "discriminator": [
        174,
        163,
        11,
        208,
        150,
        236,
        11,
        205
      ]
    },
    {
      "name": "winnerRecord",
      "discriminator": [
        248,
        27,
        49,
        33,
        45,
        88,
        210,
        100
      ]
    }
  ],
  "events": [
    {
      "name": "answerSubmitted",
      "discriminator": [
        197,
        84,
        24,
        211,
        90,
        196,
        234,
        120
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Only the authority can perform this action"
    },
    {
      "code": 6001,
      "name": "noActiveQuest",
      "msg": "No active quest"
    },
    {
      "code": 6002,
      "name": "deadlineExpired",
      "msg": "The deadline for this question has passed"
    },
    {
      "code": 6003,
      "name": "invalidProof",
      "msg": "ZK proof verification failed"
    },
    {
      "code": 6004,
      "name": "invalidDeadline",
      "msg": "Deadline must be in the future"
    },
    {
      "code": 6005,
      "name": "insufficientReward",
      "msg": "Reward amount must be greater than zero"
    },
    {
      "code": 6006,
      "name": "questionTooLong",
      "msg": "Question exceeds maximum length"
    },
    {
      "code": 6007,
      "name": "alreadyAnswered",
      "msg": "Already answered this round"
    },
    {
      "code": 6008,
      "name": "invalidMinRewardCount",
      "msg": "Invalid reward config: need 0 < min <= max"
    },
    {
      "code": 6009,
      "name": "invalidStakeConfig",
      "msg": "Stake config values must be > 0"
    },
    {
      "code": 6010,
      "name": "unstakeNotReady",
      "msg": "Cannot unstake until round advances or deadline passes"
    },
    {
      "code": 6011,
      "name": "insufficientStakeBalance",
      "msg": "Unstake amount exceeds staked balance"
    },
    {
      "code": 6012,
      "name": "insufficientStake",
      "msg": "Stake does not meet dynamic requirement"
    },
    {
      "code": 6013,
      "name": "questIntervalTooShort",
      "msg": "Quest interval too short"
    },
    {
      "code": 6014,
      "name": "insufficientTreasury",
      "msg": "Insufficient treasury balance"
    },
    {
      "code": 6015,
      "name": "invalidRewardPerShare",
      "msg": "Invalid reward config: reward_per_share and extra_reward cannot both be 0"
    },
    {
      "code": 6016,
      "name": "invalidDelta",
      "msg": "Delta must not be zero"
    },
    {
      "code": 6017,
      "name": "freeCreditsOverflow",
      "msg": "Free credits overflow"
    },
    {
      "code": 6018,
      "name": "airdropNotEligible",
      "msg": "Not eligible: must answer current round first"
    },
    {
      "code": 6019,
      "name": "airdropMaxReached",
      "msg": "Max airdrop count reached for this address"
    },
    {
      "code": 6020,
      "name": "airdropCooldown",
      "msg": "Must wait 24 hours between airdrop claims"
    },
    {
      "code": 6021,
      "name": "airdropDisabled",
      "msg": "Airdrop is disabled (amount = 0)"
    },
    {
      "code": 6022,
      "name": "insufficientAirdrop",
      "msg": "Airdrop fund has insufficient balance"
    }
  ],
  "types": [
    {
      "name": "answerSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "rewarded",
            "type": "bool"
          },
          {
            "name": "rewardLamports",
            "type": "u64"
          },
          {
            "name": "agent",
            "type": "string"
          },
          {
            "name": "model",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "gameConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "minRewardCount",
            "type": "u32"
          },
          {
            "name": "maxRewardCount",
            "type": "u32"
          },
          {
            "name": "stakeBpsHigh",
            "type": "u64"
          },
          {
            "name": "stakeBpsLow",
            "type": "u64"
          },
          {
            "name": "decayMs",
            "type": "i64"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "questAuthority",
            "type": "pubkey"
          },
          {
            "name": "minQuestInterval",
            "type": "i64"
          },
          {
            "name": "rewardPerShare",
            "type": "u64"
          },
          {
            "name": "extraReward",
            "type": "u64"
          },
          {
            "name": "stakeAuthority",
            "type": "pubkey"
          },
          {
            "name": "airdropAmount",
            "type": "u64"
          },
          {
            "name": "maxAirdropCount",
            "type": "u32"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "question",
            "type": "string"
          },
          {
            "name": "answerHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "rewardAmount",
            "type": "u64"
          },
          {
            "name": "rewardCount",
            "type": "u32"
          },
          {
            "name": "rewardPerWinner",
            "type": "u64"
          },
          {
            "name": "winnerCount",
            "type": "u32"
          },
          {
            "name": "difficulty",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "stakeHigh",
            "type": "u64"
          },
          {
            "name": "stakeLow",
            "type": "u64"
          },
          {
            "name": "avgParticipantStake",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "stakeRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stakeRound",
            "type": "u64"
          },
          {
            "name": "freeCredits",
            "type": "u32"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                60
              ]
            }
          }
        ]
      }
    },
    {
      "name": "winnerRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "airdropCount",
            "type": "u32"
          },
          {
            "name": "lastAirdropTs",
            "type": "i64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                52
              ]
            }
          }
        ]
      }
    }
  ]
};
