/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/nara_agent_registry.json`.
 */
export type NaraAgentRegistry = {
  "address": "AgentRegistry111111111111111111111111111111",
  "metadata": {
    "name": "naraAgentRegistry",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Nara Agent Registry - AI agent registration center"
  },
  "instructions": [
    {
      "name": "approveTweet",
      "discriminator": [
        57,
        71,
        49,
        146,
        108,
        84,
        107,
        45
      ],
      "accounts": [
        {
          "name": "verifier",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "tweetVerify",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  101,
                  101,
                  116,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "tweetRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  101,
                  101,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "tweetId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true
        },
        {
          "name": "twitterVerifyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
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
          "name": "pointMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  105,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authorityPointAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "pointMint"
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
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tweetVerifyQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  101,
                  101,
                  116,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
                  95,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "tweetId",
          "type": "u128"
        }
      ]
    },
    {
      "name": "closeBuffer",
      "discriminator": [
        46,
        114,
        179,
        58,
        57,
        45,
        194,
        172
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteAgent",
      "discriminator": [
        92,
        170,
        90,
        13,
        148,
        155,
        212,
        55
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "bio",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  111
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "metadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "memoryAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
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
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "extendSize",
          "type": "u64"
        }
      ]
    },
    {
      "name": "finalizeMemoryAppend",
      "discriminator": [
        50,
        204,
        47,
        193,
        90,
        227,
        5,
        220
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true
        },
        {
          "name": "memory",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "finalizeMemoryNew",
      "discriminator": [
        215,
        42,
        43,
        208,
        191,
        38,
        11,
        146
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true
        },
        {
          "name": "newMemory",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "finalizeMemoryUpdate",
      "discriminator": [
        163,
        20,
        118,
        65,
        132,
        16,
        239,
        4
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true
        },
        {
          "name": "newMemory",
          "writable": true
        },
        {
          "name": "oldMemory",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "initBuffer",
      "discriminator": [
        123,
        211,
        233,
        210,
        166,
        139,
        218,
        60
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "totalLen",
          "type": "u32"
        }
      ]
    },
    {
      "name": "initConfig",
      "discriminator": [
        23,
        235,
        115,
        232,
        168,
        96,
        1,
        231
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "feeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
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
          "name": "pointMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  105,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "refereeMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  102,
                  101,
                  114,
                  101,
                  101,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "refereeActivityMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  102,
                  101,
                  114,
                  101,
                  101,
                  95,
                  97,
                  99,
                  116,
                  105,
                  118,
                  105,
                  116,
                  121,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "logActivity",
      "discriminator": [
        158,
        66,
        173,
        69,
        248,
        86,
        13,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "pointMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  105,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authorityPointAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "pointMint"
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
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
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
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "model",
          "type": "string"
        },
        {
          "name": "activity",
          "type": "string"
        },
        {
          "name": "log",
          "type": "string"
        }
      ]
    },
    {
      "name": "logActivityWithReferral",
      "discriminator": [
        165,
        163,
        235,
        109,
        240,
        153,
        233,
        188
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "pointMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  105,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authorityPointAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "pointMint"
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
          "name": "referralAgent"
        },
        {
          "name": "referralAuthority",
          "writable": true
        },
        {
          "name": "referralPointAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "referralAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "pointMint"
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
          "name": "refereeActivityMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  102,
                  101,
                  114,
                  101,
                  101,
                  95,
                  97,
                  99,
                  116,
                  105,
                  118,
                  105,
                  116,
                  121,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "referralRefereeActivityAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "referralAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "refereeActivityMint"
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
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
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
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "model",
          "type": "string"
        },
        {
          "name": "activity",
          "type": "string"
        },
        {
          "name": "log",
          "type": "string"
        }
      ]
    },
    {
      "name": "registerAgent",
      "discriminator": [
        135,
        157,
        66,
        195,
        2,
        113,
        175,
        30
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "feeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "registerAgentWithReferral",
      "discriminator": [
        12,
        236,
        115,
        32,
        129,
        99,
        250,
        6
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "feeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
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
          "name": "pointMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  105,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "referralAgent"
        },
        {
          "name": "referralAuthority",
          "writable": true
        },
        {
          "name": "referralPointAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "referralAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "pointMint"
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
          "name": "refereeMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  102,
                  101,
                  114,
                  101,
                  101,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "referralRefereeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "referralAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "refereeMint"
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
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
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
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "rejectTweet",
      "discriminator": [
        231,
        64,
        127,
        185,
        55,
        253,
        175,
        30
      ],
      "accounts": [
        {
          "name": "verifier",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "tweetVerify",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  101,
                  101,
                  116,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "tweetVerifyQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  101,
                  101,
                  116,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
                  95,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "rejectTwitter",
      "discriminator": [
        97,
        238,
        35,
        162,
        61,
        92,
        88,
        183
      ],
      "accounts": [
        {
          "name": "verifier",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "twitter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "twitterQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "setBio",
      "discriminator": [
        196,
        133,
        219,
        43,
        75,
        223,
        195,
        213
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "bioAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  111
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "bio",
          "type": "string"
        }
      ]
    },
    {
      "name": "setMetadata",
      "discriminator": [
        78,
        157,
        75,
        242,
        151,
        20,
        121,
        144
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "metadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "data",
          "type": "string"
        }
      ]
    },
    {
      "name": "setReferral",
      "discriminator": [
        213,
        23,
        157,
        74,
        199,
        152,
        182,
        8
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "referralAgent"
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "refereeMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  102,
                  101,
                  114,
                  101,
                  101,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "referralAuthority",
          "writable": true
        },
        {
          "name": "referralRefereeAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
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
          "name": "agentId",
          "type": "string"
        }
      ]
    },
    {
      "name": "setTwitter",
      "discriminator": [
        136,
        238,
        98,
        223,
        118,
        178,
        238,
        183
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "twitter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "twitterVerifyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
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
          "name": "twitterQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "username",
          "type": "string"
        },
        {
          "name": "tweetUrl",
          "type": "string"
        }
      ]
    },
    {
      "name": "submitTweet",
      "discriminator": [
        140,
        200,
        213,
        38,
        145,
        255,
        191,
        254
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "twitter",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "tweetVerify",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  101,
                  101,
                  116,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "twitterVerifyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
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
          "name": "tweetVerifyQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  101,
                  101,
                  116,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
                  95,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "tweetRecord",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  101,
                  101,
                  116,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "tweetId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "tweetId",
          "type": "u128"
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
          "name": "authority",
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "unbindTwitter",
      "discriminator": [
        93,
        66,
        28,
        60,
        27,
        34,
        252,
        166
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "twitter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "twitterHandle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  104,
                  97,
                  110,
                  100,
                  108,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "username"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "twitterVerifyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "username",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateActivityConfig",
      "discriminator": [
        167,
        203,
        189,
        80,
        145,
        175,
        74,
        127
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
        }
      ],
      "args": [
        {
          "name": "activityReward",
          "type": "u64"
        },
        {
          "name": "referralActivityReward",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateAdmin",
      "discriminator": [
        161,
        176,
        40,
        213,
        60,
        184,
        179,
        228
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updatePointsConfig",
      "discriminator": [
        15,
        89,
        27,
        201,
        127,
        239,
        187,
        80
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
        }
      ],
      "args": [
        {
          "name": "pointsSelf",
          "type": "u64"
        },
        {
          "name": "pointsReferral",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateReferralConfig",
      "discriminator": [
        129,
        209,
        121,
        34,
        163,
        184,
        187,
        56
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
        }
      ],
      "args": [
        {
          "name": "referralDiscountBps",
          "type": "u64"
        },
        {
          "name": "referralShareBps",
          "type": "u64"
        },
        {
          "name": "referralRegisterPoints",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateRegisterFee",
      "discriminator": [
        16,
        11,
        242,
        97,
        55,
        197,
        142,
        249
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
        }
      ],
      "args": [
        {
          "name": "fee",
          "type": "u64"
        },
        {
          "name": "fee7",
          "type": "u64"
        },
        {
          "name": "fee6",
          "type": "u64"
        },
        {
          "name": "fee5",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateTweetVerifyConfig",
      "discriminator": [
        16,
        173,
        44,
        208,
        249,
        61,
        172,
        152
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
        }
      ],
      "args": [
        {
          "name": "reward",
          "type": "u64"
        },
        {
          "name": "points",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateTwitterVerificationConfig",
      "discriminator": [
        74,
        177,
        105,
        71,
        46,
        192,
        112,
        135
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
        }
      ],
      "args": [
        {
          "name": "fee",
          "type": "u64"
        },
        {
          "name": "reward",
          "type": "u64"
        },
        {
          "name": "points",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateTwitterVerifier",
      "discriminator": [
        81,
        250,
        176,
        204,
        250,
        169,
        146,
        144
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
        }
      ],
      "args": [
        {
          "name": "newVerifier",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "verifyTwitter",
      "discriminator": [
        170,
        213,
        202,
        134,
        247,
        139,
        15,
        24
      ],
      "accounts": [
        {
          "name": "verifier",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "twitter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "twitterHandle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  104,
                  97,
                  110,
                  100,
                  108,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "username"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true
        },
        {
          "name": "twitterVerifyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
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
          "name": "pointMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  105,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authorityPointAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "pointMint"
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
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "twitterQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "username",
          "type": "string"
        }
      ]
    },
    {
      "name": "withdrawFees",
      "discriminator": [
        198,
        212,
        171,
        109,
        144,
        215,
        174,
        89
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "feeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
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
      "name": "withdrawTwitterVerifyFees",
      "discriminator": [
        64,
        212,
        105,
        60,
        34,
        93,
        221,
        176
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "twitterVerifyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  105,
                  116,
                  116,
                  101,
                  114,
                  95,
                  118,
                  101,
                  114,
                  105,
                  102,
                  121,
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
      "name": "writeToBuffer",
      "discriminator": [
        114,
        53,
        121,
        144,
        201,
        97,
        248,
        69
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "agent",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agentId"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "agentId",
          "type": "string"
        },
        {
          "name": "offset",
          "type": "u32"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "agentState",
      "discriminator": [
        254,
        187,
        98,
        119,
        228,
        48,
        47,
        49
      ]
    },
    {
      "name": "agentTwitter",
      "discriminator": [
        71,
        53,
        221,
        107,
        16,
        244,
        30,
        181
      ]
    },
    {
      "name": "memoryBuffer",
      "discriminator": [
        58,
        228,
        180,
        234,
        11,
        227,
        220,
        144
      ]
    },
    {
      "name": "programConfig",
      "discriminator": [
        196,
        210,
        90,
        231,
        144,
        149,
        140,
        63
      ]
    },
    {
      "name": "tweetRecord",
      "discriminator": [
        13,
        25,
        5,
        236,
        64,
        149,
        72,
        215
      ]
    },
    {
      "name": "tweetVerify",
      "discriminator": [
        6,
        26,
        187,
        54,
        43,
        97,
        119,
        79
      ]
    },
    {
      "name": "twitterHandle",
      "discriminator": [
        146,
        117,
        11,
        222,
        176,
        213,
        252,
        249
      ]
    }
  ],
  "events": [
    {
      "name": "activityLogged",
      "discriminator": [
        33,
        168,
        103,
        55,
        141,
        197,
        74,
        39
      ]
    },
    {
      "name": "twitterBindRequested",
      "discriminator": [
        251,
        254,
        188,
        154,
        25,
        126,
        76,
        169
      ]
    },
    {
      "name": "twitterBindResult",
      "discriminator": [
        4,
        160,
        91,
        219,
        142,
        73,
        75,
        215
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "agentIdTooShort",
      "msg": "Agent ID too short: min 5 bytes"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6002,
      "name": "offsetMismatch",
      "msg": "Buffer write offset mismatch: writes must be sequential"
    },
    {
      "code": 6003,
      "name": "writeOutOfBounds",
      "msg": "Write out of bounds"
    },
    {
      "code": 6004,
      "name": "bufferIncomplete",
      "msg": "Buffer not fully written"
    },
    {
      "code": 6005,
      "name": "pendingBufferExists",
      "msg": "A pending buffer already exists; call close_buffer first"
    },
    {
      "code": 6006,
      "name": "invalidBufferSize",
      "msg": "Buffer account size does not match total_len"
    },
    {
      "code": 6007,
      "name": "invalidBufferOwner",
      "msg": "Buffer account must be owned by this program"
    },
    {
      "code": 6008,
      "name": "bufferMismatch",
      "msg": "Buffer account does not match agent.pending_buffer"
    },
    {
      "code": 6009,
      "name": "invalidMemoryOwner",
      "msg": "Memory account must be owned by this program"
    },
    {
      "code": 6010,
      "name": "invalidMemorySize",
      "msg": "Memory account size does not match buffer total_len"
    },
    {
      "code": 6011,
      "name": "memoryMismatch",
      "msg": "old_memory account does not match agent.memory"
    },
    {
      "code": 6012,
      "name": "memoryAlreadyExists",
      "msg": "Agent already has memory; use finalize_memory_update or finalize_memory_append instead"
    },
    {
      "code": 6013,
      "name": "memoryNotFound",
      "msg": "Agent has no existing memory; use finalize_memory_new instead"
    },
    {
      "code": 6014,
      "name": "hasPendingBuffer",
      "msg": "Cannot perform this operation while a pending buffer exists"
    },
    {
      "code": 6015,
      "name": "insufficientFeeVaultBalance",
      "msg": "Fee vault has insufficient balance for withdrawal"
    },
    {
      "code": 6016,
      "name": "agentIdTooLong",
      "msg": "Agent ID too long: max 32 bytes"
    },
    {
      "code": 6017,
      "name": "agentIdNotLowercase",
      "msg": "Agent ID must be lowercase"
    },
    {
      "code": 6018,
      "name": "questIxNotFound",
      "msg": "No valid submit_answer instruction found in transaction"
    },
    {
      "code": 6019,
      "name": "referralNotFound",
      "msg": "Referral agent not found"
    },
    {
      "code": 6020,
      "name": "invalidReferralAuthority",
      "msg": "Referral authority does not match referral agent's authority"
    },
    {
      "code": 6021,
      "name": "memoryAlreadyInitialized",
      "msg": "Memory account is already initialized"
    },
    {
      "code": 6022,
      "name": "invalidReferralFeeConfig",
      "msg": "referral_fee_share must not exceed referral_register_fee"
    },
    {
      "code": 6023,
      "name": "invalidReferralPointAccount",
      "msg": "referral_point_account is not the correct ATA"
    },
    {
      "code": 6024,
      "name": "cpiNotAllowed",
      "msg": "log_activity cannot be called via CPI"
    },
    {
      "code": 6025,
      "name": "duplicateLogActivity",
      "msg": "Only one log_activity allowed per transaction"
    },
    {
      "code": 6026,
      "name": "questUserMismatch",
      "msg": "Quest user does not match log_activity authority"
    },
    {
      "code": 6027,
      "name": "referralAlreadySet",
      "msg": "Referral is already set and cannot be changed"
    },
    {
      "code": 6028,
      "name": "selfReferral",
      "msg": "Cannot set self as referral"
    },
    {
      "code": 6029,
      "name": "twitterVerifierNotSet",
      "msg": "Twitter verifier not configured"
    },
    {
      "code": 6030,
      "name": "notTwitterVerifier",
      "msg": "Unauthorized: not the twitter verifier"
    },
    {
      "code": 6031,
      "name": "twitterUsernameTooLong",
      "msg": "Twitter username too long"
    },
    {
      "code": 6032,
      "name": "twitterUsernameEmpty",
      "msg": "Twitter username is empty"
    },
    {
      "code": 6033,
      "name": "tweetUrlTooLong",
      "msg": "Tweet URL too long"
    },
    {
      "code": 6034,
      "name": "tweetUrlEmpty",
      "msg": "Tweet URL is empty"
    },
    {
      "code": 6035,
      "name": "twitterNotPending",
      "msg": "Twitter account is not in pending status"
    },
    {
      "code": 6036,
      "name": "twitterNotVerified",
      "msg": "Twitter account is not in verified status"
    },
    {
      "code": 6037,
      "name": "twitterHandleAlreadyBound",
      "msg": "Twitter handle already bound to another agent"
    },
    {
      "code": 6038,
      "name": "insufficientTwitterVerifyVaultBalance",
      "msg": "Twitter verify vault has insufficient balance"
    },
    {
      "code": 6039,
      "name": "tweetVerifyCooldown",
      "msg": "Tweet verification is in cooldown period"
    },
    {
      "code": 6040,
      "name": "tweetVerifyNotPending",
      "msg": "Tweet verification is not in pending status"
    },
    {
      "code": 6041,
      "name": "tweetVerifyAlreadyPending",
      "msg": "Tweet verification already pending"
    },
    {
      "code": 6042,
      "name": "twitterHandleAlreadyTaken",
      "msg": "Twitter handle is already bound to another agent"
    },
    {
      "code": 6043,
      "name": "twitterAlreadyVerified",
      "msg": "Twitter is already verified, unbind first"
    },
    {
      "code": 6044,
      "name": "invalidTweetUrlFormat",
      "msg": "Invalid tweet URL format"
    },
    {
      "code": 6045,
      "name": "tweetAlreadyApproved",
      "msg": "Tweet has already been approved"
    },
    {
      "code": 6046,
      "name": "agentIdReserved",
      "msg": "Agent ID length <= 4 is reserved for admin only"
    }
  ],
  "types": [
    {
      "name": "activityLogged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentId",
            "type": "string"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "model",
            "type": "string"
          },
          {
            "name": "activity",
            "type": "string"
          },
          {
            "name": "log",
            "type": "string"
          },
          {
            "name": "referralId",
            "type": "string"
          },
          {
            "name": "pointsEarned",
            "type": "u64"
          },
          {
            "name": "referralPointsEarned",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentState",
      "docs": [
        "PDA metadata account for an agent, seeds = [SEED_AGENT, agent_id.as_bytes()]."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "pendingBuffer",
            "type": "pubkey"
          },
          {
            "name": "memory",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "version",
            "type": "u32"
          },
          {
            "name": "agentIdLen",
            "type": "u32"
          },
          {
            "name": "agentId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "referralIdLen",
            "type": "u32"
          },
          {
            "name": "referralId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "padding",
            "type": "u32"
          },
          {
            "name": "reserved",
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
      "name": "agentTwitter",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentIdLen",
            "type": "u64"
          },
          {
            "name": "agentId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "type": "u64"
          },
          {
            "name": "verifiedAt",
            "type": "i64"
          },
          {
            "name": "usernameLen",
            "type": "u64"
          },
          {
            "name": "tweetUrlLen",
            "type": "u64"
          },
          {
            "name": "username",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "tweetUrl",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "reserved2",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "memoryBuffer",
      "docs": [
        "Client-created zero-copy account for chunked uploads.",
        "Fixed header followed by raw data bytes."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "totalLen",
            "type": "u32"
          },
          {
            "name": "writeOffset",
            "type": "u32"
          },
          {
            "name": "reserved",
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
      "name": "programConfig",
      "docs": [
        "Global program configuration. Single PDA, seeds = [SEED_CONFIG].",
        "Created once by the first caller of `init_config`; that caller becomes admin."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "feeVault",
            "type": "pubkey"
          },
          {
            "name": "pointMint",
            "type": "pubkey"
          },
          {
            "name": "refereeMint",
            "type": "pubkey"
          },
          {
            "name": "refereeActivityMint",
            "type": "pubkey"
          },
          {
            "name": "registerFee",
            "type": "u64"
          },
          {
            "name": "pointsSelf",
            "type": "u64"
          },
          {
            "name": "pointsReferral",
            "type": "u64"
          },
          {
            "name": "referralDiscountBps",
            "type": "u64"
          },
          {
            "name": "referralShareBps",
            "type": "u64"
          },
          {
            "name": "referralRegisterPoints",
            "type": "u64"
          },
          {
            "name": "activityReward",
            "type": "u64"
          },
          {
            "name": "referralActivityReward",
            "type": "u64"
          },
          {
            "name": "twitterVerifier",
            "type": "pubkey"
          },
          {
            "name": "twitterVerificationFee",
            "type": "u64"
          },
          {
            "name": "twitterVerificationReward",
            "type": "u64"
          },
          {
            "name": "twitterVerificationPoints",
            "type": "u64"
          },
          {
            "name": "tweetVerifyReward",
            "type": "u64"
          },
          {
            "name": "tweetVerifyPoints",
            "type": "u64"
          },
          {
            "name": "registerFee7",
            "type": "u64"
          },
          {
            "name": "registerFee6",
            "type": "u64"
          },
          {
            "name": "registerFee5",
            "type": "u64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "reserved2",
            "type": {
              "array": [
                "u8",
                96
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tweetRecord",
      "docs": [
        "Records an approved tweet to prevent duplicate submissions.",
        "Seeds: [SEED_TWEET_RECORD, &tweet_id.to_le_bytes()]"
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "docs": [
              "The agent PDA that submitted this tweet"
            ],
            "type": "pubkey"
          },
          {
            "name": "approvedAt",
            "docs": [
              "Unix timestamp when this tweet was approved"
            ],
            "type": "i64"
          },
          {
            "name": "tweetId",
            "docs": [
              "Tweet ID (Twitter snowflake ID)"
            ],
            "type": "u128"
          },
          {
            "name": "reserved",
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
      "name": "tweetVerify",
      "docs": [
        "Per-agent tweet verification state.",
        "Seeds: [SEED_TWEET_VERIFY, agent_pda.as_ref()]"
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentIdLen",
            "type": "u64"
          },
          {
            "name": "agentId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "docs": [
              "0 = Idle, 1 = Pending"
            ],
            "type": "u64"
          },
          {
            "name": "submittedAt",
            "docs": [
              "Unix timestamp when the tweet was submitted"
            ],
            "type": "i64"
          },
          {
            "name": "lastRewardedAt",
            "docs": [
              "Unix timestamp of the last successful reward (for cooldown)"
            ],
            "type": "i64"
          },
          {
            "name": "tweetId",
            "docs": [
              "Tweet ID (Twitter snowflake ID)"
            ],
            "type": "u128"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "reserved2",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "reserved3",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "reserved4",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "reserved5",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "reserved6",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "twitterBindRequested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentId",
            "type": "string"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "username",
            "type": "string"
          },
          {
            "name": "fee",
            "type": "u64"
          },
          {
            "name": "isFirstBind",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "twitterBindResult",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentId",
            "type": "string"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "username",
            "type": "string"
          },
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "feeRefunded",
            "type": "u64"
          },
          {
            "name": "reward",
            "type": "u64"
          },
          {
            "name": "points",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "twitterHandle",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ]
};
