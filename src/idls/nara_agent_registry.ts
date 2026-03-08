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
          "name": "feeRecipient",
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
          "name": "feeRecipient",
          "writable": true
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
      "name": "updateFeeRecipient",
      "discriminator": [
        249,
        0,
        198,
        35,
        183,
        123,
        57,
        188
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
          "name": "newRecipient",
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
          "name": "referralRegisterFee",
          "type": "u64"
        },
        {
          "name": "referralFeeShare",
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
          "name": "newFee",
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
      "name": "invalidFeeRecipient",
      "msg": "Fee recipient does not match config.fee_recipient"
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
            "name": "feeRecipient",
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
            "name": "referralRegisterFee",
            "type": "u64"
          },
          {
            "name": "referralFeeShare",
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
