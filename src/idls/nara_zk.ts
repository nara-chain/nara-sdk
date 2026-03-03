/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/nara_zk.json`.
 */
export type NaraZk = {
  "address": "Dp4Jb4fmfK1HHVzjMAnWumE5iLuzDsfc4VdRVL7XmY82",
  "metadata": {
    "name": "naraZk",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "zkId",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  122,
                  107,
                  95,
                  105,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "nameHash"
              }
            ]
          }
        },
        {
          "name": "inbox",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "nameHash"
              }
            ]
          }
        },
        {
          "name": "merkleTree",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "denomination"
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
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "denomination"
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
          "name": "nameHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "denomination",
          "type": "u64"
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
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "merkleTree",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "denomination"
              }
            ]
          }
        },
        {
          "name": "pool",
          "docs": [
            "Pool is small (PoolAccount::SIZE = 17 bytes), safe to init in-transaction."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "denomination"
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
          "name": "denomination",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
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
          "name": "feeRecipient",
          "type": "pubkey"
        },
        {
          "name": "feeAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "register",
      "discriminator": [
        211,
        124,
        67,
        15,
        211,
        194,
        178,
        240
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "zkId",
          "docs": [
            "ZkIdAccount is small (81 bytes), init in-transaction is fine."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  122,
                  107,
                  95,
                  105,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "nameHash"
              }
            ]
          }
        },
        {
          "name": "inbox",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "nameHash"
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
          "docs": [
            "Receives the registration fee. Must match config.fee_recipient."
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nameHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "idCommitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "transferZkId",
      "discriminator": [
        58,
        45,
        142,
        162,
        7,
        21,
        17,
        83
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "zkId",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  122,
                  107,
                  95,
                  105,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "nameHash"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "nameHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "newIdCommitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "ownershipProof",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
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
        },
        {
          "name": "newFeeRecipient",
          "type": "pubkey"
        },
        {
          "name": "newFeeAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "merkleTree",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "denomination"
              }
            ]
          }
        },
        {
          "name": "nullifier",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  117,
                  108,
                  108,
                  105,
                  102,
                  105,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "denomination"
              },
              {
                "kind": "arg",
                "path": "nullifierHash"
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
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "denomination"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": "bytes"
        },
        {
          "name": "root",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nullifierHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "recipient",
          "type": "pubkey"
        },
        {
          "name": "denomination",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "configAccount",
      "discriminator": [
        189,
        255,
        97,
        70,
        186,
        189,
        24,
        102
      ]
    },
    {
      "name": "inboxAccount",
      "discriminator": [
        147,
        234,
        102,
        169,
        64,
        27,
        234,
        181
      ]
    },
    {
      "name": "merkleTreeAccount",
      "discriminator": [
        147,
        200,
        34,
        248,
        131,
        187,
        248,
        253
      ]
    },
    {
      "name": "nullifierAccount",
      "discriminator": [
        250,
        31,
        238,
        177,
        213,
        98,
        48,
        172
      ]
    },
    {
      "name": "poolAccount",
      "discriminator": [
        116,
        210,
        187,
        119,
        196,
        196,
        52,
        137
      ]
    },
    {
      "name": "zkIdAccount",
      "discriminator": [
        13,
        214,
        138,
        31,
        10,
        40,
        26,
        226
      ]
    }
  ],
  "events": [
    {
      "name": "depositEvent",
      "discriminator": [
        120,
        248,
        61,
        83,
        31,
        142,
        107,
        144
      ]
    },
    {
      "name": "transferZkIdEvent",
      "discriminator": [
        234,
        40,
        235,
        238,
        161,
        211,
        159,
        16
      ]
    },
    {
      "name": "withdrawEvent",
      "discriminator": [
        22,
        9,
        133,
        26,
        160,
        44,
        71,
        192
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "merkleTreeFull",
      "msg": "Merkle tree is full"
    },
    {
      "code": 6001,
      "name": "invalidDenomination",
      "msg": "Invalid denomination"
    },
    {
      "code": 6002,
      "name": "unknownRoot",
      "msg": "Unknown Merkle root"
    },
    {
      "code": 6003,
      "name": "nullifierAlreadyUsed",
      "msg": "Nullifier has already been used"
    },
    {
      "code": 6004,
      "name": "invalidProof",
      "msg": "Invalid ZK proof"
    },
    {
      "code": 6005,
      "name": "zkIdAlreadyRegistered",
      "msg": "ZK ID already registered"
    },
    {
      "code": 6006,
      "name": "zkIdNotFound",
      "msg": "ZK ID not found"
    },
    {
      "code": 6007,
      "name": "ownershipProofFailed",
      "msg": "Ownership proof verification failed"
    },
    {
      "code": 6008,
      "name": "poseidonHashFailed",
      "msg": "Poseidon hash computation failed"
    },
    {
      "code": 6009,
      "name": "unauthorized",
      "msg": "Caller is not the program admin"
    },
    {
      "code": 6010,
      "name": "invalidFeeRecipient",
      "msg": "Fee recipient account does not match config"
    }
  ],
  "types": [
    {
      "name": "configAccount",
      "docs": [
        "Program config. PDA seeds: [\"config\"]",
        "Stores admin, fee recipient, and registration fee amount."
      ],
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
            "name": "feeAmount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "depositEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nameHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": "u64"
          },
          {
            "name": "denomination",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "inboxAccount",
      "docs": [
        "Inbox ring buffer. PDA seeds: [\"inbox\", name_hash]",
        "Zero-copy. INBOX_SIZE = 64 (power of 2 for bytemuck compatibility).",
        "Layout: entries(64×16=1024) + head(1) + count(1) + bump(1) + _pad(5) = 1032 bytes"
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entries",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "inboxEntry"
                  }
                },
                64
              ]
            }
          },
          {
            "name": "head",
            "type": "u8"
          },
          {
            "name": "count",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "pad",
            "type": {
              "array": [
                "u8",
                5
              ]
            }
          }
        ]
      }
    },
    {
      "name": "inboxEntry",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "leafIndex",
            "type": "u64"
          },
          {
            "name": "denomination",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "merkleTreeAccount",
      "docs": [
        "Merkle tree. PDA seeds: [\"tree\", denomination_le_bytes]",
        "Zero-copy — too large for stack.",
        "Layout (offsets within struct data, after 8-byte discriminator):",
        "0: levels(4), 4: current_root_index(4)",
        "8: next_index(8, u64, 8-byte aligned ✓), 16: denomination(8)",
        "24: bump(1), 25: _pad(7) → 32",
        "32: filled_subtrees(64×32=2048) → 2080: roots(30×32=960) → 3040: zeros(64×32=2048)",
        "Struct size: 5088 bytes (multiple of 8 ✓) → SIZE = 5096",
        "",
        "`zeros[i]` = empty-subtree hash at level i, computed once in init() and",
        "reused by insert() to avoid re-hashing on every deposit."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "levels",
            "type": "u32"
          },
          {
            "name": "currentRootIndex",
            "type": "u32"
          },
          {
            "name": "nextIndex",
            "type": "u64"
          },
          {
            "name": "denomination",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "pad",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "filledSubtrees",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                64
              ]
            }
          },
          {
            "name": "roots",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                30
              ]
            }
          },
          {
            "name": "zeros",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "nullifierAccount",
      "docs": [
        "Nullifier marker. PDA seeds: [\"nullifier\", denomination_le_bytes, nullifier_hash]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "poolAccount",
      "docs": [
        "Pool: program-owned SOL vault. PDA seeds: [\"pool\", denomination_le_bytes]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "denomination",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "transferZkIdEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nameHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "withdrawEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nullifierHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "denomination",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "zkIdAccount",
      "docs": [
        "ZK ID. PDA seeds: [\"zk_id\", name_hash]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nameHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "idCommitment",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "depositCount",
            "type": "u32"
          },
          {
            "name": "commitmentStartIndex",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
