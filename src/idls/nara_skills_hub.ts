/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/nara_skills_hub.json`.
 */
export type NaraSkillsHub = {
  "address": "SkiLLHub11111111111111111111111111111111111",
  "metadata": {
    "name": "naraSkillsHub",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
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
          "signer": true
        },
        {
          "name": "skill",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
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
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteSkill",
      "discriminator": [
        17,
        38,
        1,
        212,
        5,
        56,
        231,
        151
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "skill",
          "docs": [
            "SkillRecord PDA — closed by Anchor after the handler returns."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "description",
          "docs": [
            "Closed inside the handler if it has been created."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  115,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "skill"
              }
            ]
          }
        },
        {
          "name": "metadata",
          "docs": [
            "Closed inside the handler if it has been created."
          ],
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
                "path": "skill"
              }
            ]
          }
        },
        {
          "name": "contentAccount",
          "docs": [
            "Pass any account (e.g. authority) when skill has no content."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "finalizeSkillNew",
      "discriminator": [
        253,
        108,
        88,
        38,
        27,
        56,
        113,
        217
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "skill",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true
        },
        {
          "name": "newContent",
          "docs": [
            "space = SkillContent::required_size(total_len))."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "finalizeSkillUpdate",
      "discriminator": [
        43,
        248,
        97,
        58,
        212,
        79,
        238,
        179
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "skill",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true
        },
        {
          "name": "newContent",
          "docs": [
            "space = SkillContent::required_size(total_len))."
          ],
          "writable": true
        },
        {
          "name": "oldContent",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
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
          "signer": true
        },
        {
          "name": "skill",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "buffer",
          "docs": [
            "Pre-created by the client (owner = this program, data all zeros).",
            "load_init() writes the discriminator + header fields."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "name",
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "registerSkill",
      "discriminator": [
        166,
        249,
        255,
        189,
        192,
        197,
        102,
        2
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "skill",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
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
          "name": "name",
          "type": "string"
        },
        {
          "name": "author",
          "type": "string"
        }
      ]
    },
    {
      "name": "setDescription",
      "discriminator": [
        234,
        4,
        121,
        243,
        47,
        60,
        8,
        236
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "skill",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "descriptionAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  115,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "skill"
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
          "name": "name",
          "type": "string"
        },
        {
          "name": "description",
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
          "signer": true
        },
        {
          "name": "skill",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "newAuthority",
          "type": "pubkey"
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
      "name": "updateMetadata",
      "discriminator": [
        170,
        182,
        43,
        239,
        97,
        78,
        225,
        186
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "skill",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
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
                "path": "skill"
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
          "name": "name",
          "type": "string"
        },
        {
          "name": "data",
          "type": "string"
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
          "name": "vault",
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
          "signer": true
        },
        {
          "name": "skill",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  107,
                  105,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "name"
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
          "name": "name",
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
      "name": "skillBuffer",
      "discriminator": [
        217,
        98,
        189,
        63,
        233,
        27,
        210,
        167
      ]
    },
    {
      "name": "skillDescription",
      "discriminator": [
        58,
        166,
        16,
        132,
        106,
        56,
        181,
        142
      ]
    },
    {
      "name": "skillMetadata",
      "discriminator": [
        104,
        219,
        78,
        200,
        70,
        39,
        68,
        145
      ]
    },
    {
      "name": "skillRecord",
      "discriminator": [
        228,
        44,
        57,
        187,
        245,
        201,
        7,
        203
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "nameTooShort",
      "msg": "Name too short: min 4 bytes"
    },
    {
      "code": 6001,
      "name": "nameTooLong",
      "msg": "Name too long: max 32 bytes"
    },
    {
      "code": 6002,
      "name": "descriptionTooLong",
      "msg": "Description too long: max 512 bytes"
    },
    {
      "code": 6003,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6004,
      "name": "offsetMismatch",
      "msg": "Buffer write offset mismatch: writes must be sequential"
    },
    {
      "code": 6005,
      "name": "writeOutOfBounds",
      "msg": "Write out of bounds"
    },
    {
      "code": 6006,
      "name": "bufferIncomplete",
      "msg": "Buffer not fully written"
    },
    {
      "code": 6007,
      "name": "pendingBufferExists",
      "msg": "A pending buffer already exists; call close_buffer first"
    },
    {
      "code": 6008,
      "name": "invalidBufferSize",
      "msg": "Buffer account size does not match total_len"
    },
    {
      "code": 6009,
      "name": "bufferMismatch",
      "msg": "Buffer account does not match skill.pending_buffer"
    },
    {
      "code": 6010,
      "name": "invalidContentOwner",
      "msg": "Content account must be owned by this program"
    },
    {
      "code": 6011,
      "name": "invalidContentSize",
      "msg": "Content account size does not match buffer total_len"
    },
    {
      "code": 6012,
      "name": "contentMismatch",
      "msg": "old_content account does not match skill.content"
    },
    {
      "code": 6013,
      "name": "contentAlreadyExists",
      "msg": "Skill already has content; use finalize_skill_update instead"
    },
    {
      "code": 6014,
      "name": "contentNotFound",
      "msg": "Skill has no existing content; use finalize_skill_new instead"
    },
    {
      "code": 6015,
      "name": "hasPendingBuffer",
      "msg": "Cannot perform this operation while a pending buffer exists"
    },
    {
      "code": 6016,
      "name": "invalidFeeVault",
      "msg": "Fee vault does not match the expected PDA"
    },
    {
      "code": 6017,
      "name": "insufficientVaultBalance",
      "msg": "Insufficient vault balance for withdrawal"
    },
    {
      "code": 6018,
      "name": "authorTooLong",
      "msg": "Author name too long: max 64 bytes"
    },
    {
      "code": 6019,
      "name": "nameNotLowercase",
      "msg": "Name must be lowercase: uppercase letters are not allowed"
    },
    {
      "code": 6020,
      "name": "contentAlreadyInitialized",
      "msg": "new_content account is already initialized"
    },
    {
      "code": 6021,
      "name": "contentSelfReference",
      "msg": "new_content must differ from old_content"
    },
    {
      "code": 6022,
      "name": "metadataTooLong",
      "msg": "Metadata too long: max 800 bytes"
    }
  ],
  "types": [
    {
      "name": "programConfig",
      "docs": [
        "Global program configuration. Single PDA, seeds = [b\"config\"].",
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
            "docs": [
              "Who may call update_admin / update_register_fee / withdraw_fees."
            ],
            "type": "pubkey"
          },
          {
            "name": "registerFee",
            "docs": [
              "SOL fee (in lamports) charged on every `register_skill`. 0 = free."
            ],
            "type": "u64"
          },
          {
            "name": "feeVault",
            "docs": [
              "PDA vault that collects registration fees. seeds = [b\"fee_vault\"], immutable."
            ],
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
    },
    {
      "name": "skillBuffer",
      "docs": [
        "Client-created zero-copy account (owner = program) used for chunked uploads.",
        "Fixed header followed by raw data bytes.",
        "",
        "The client calls `system_program::create_account` with",
        "`space = SkillBuffer::required_size(total_len), owner = program_id`",
        "then calls `init_buffer`, which uses `load_init()` to write the header.",
        "Subsequent `write_to_buffer` calls advance `write_offset` sequentially."
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
            "docs": [
              "Must match the SkillRecord's authority."
            ],
            "type": "pubkey"
          },
          {
            "name": "skill",
            "docs": [
              "The SkillRecord PDA this buffer is uploading to."
            ],
            "type": "pubkey"
          },
          {
            "name": "totalLen",
            "docs": [
              "Expected total number of data bytes."
            ],
            "type": "u32"
          },
          {
            "name": "writeOffset",
            "docs": [
              "Current write cursor. Each `write_to_buffer` call advances this.",
              "Client supplies the expected offset; contract rejects mismatches."
            ],
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
      "name": "skillDescription",
      "docs": [
        "PDA for a skill's short description, seeds = [b\"desc\", skill_record.key()].",
        "Created / updated via `set_description`. Always allocated at fixed size."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "descriptionLen",
            "docs": [
              "Length of the description stored in the `description` array."
            ],
            "type": "u16"
          },
          {
            "name": "description",
            "docs": [
              "One-sentence description (max 512 bytes)."
            ],
            "type": {
              "array": [
                "u8",
                512
              ]
            }
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
      "name": "skillMetadata",
      "docs": [
        "PDA for a skill's custom JSON metadata, seeds = [b\"meta\", skill_record.key()].",
        "Created lazily on first `update_metadata` call.",
        "Always allocated at fixed size."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dataLen",
            "docs": [
              "Length of the data stored in the `data` array."
            ],
            "type": "u16"
          },
          {
            "name": "data",
            "docs": [
              "Arbitrary JSON string (max 800 bytes)."
            ],
            "type": {
              "array": [
                "u8",
                800
              ]
            }
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
      "name": "skillRecord",
      "docs": [
        "PDA metadata account for a skill, seeds = [b\"skill\", name.as_bytes()].",
        "Stores the authority, a pointer to the content account, and an optional",
        "pending-buffer pointer. Created by the contract via `register_skill`."
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
            "docs": [
              "Who may update this skill."
            ],
            "type": "pubkey"
          },
          {
            "name": "content",
            "docs": [
              "Current SkillContent account. Pubkey::default() = no content yet."
            ],
            "type": "pubkey"
          },
          {
            "name": "pendingBuffer",
            "docs": [
              "Active upload buffer, if any. Pubkey::default() = no pending buffer."
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp when the skill was first registered."
            ],
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "docs": [
              "Unix timestamp of the last content update (0 = no content yet)."
            ],
            "type": "i64"
          },
          {
            "name": "version",
            "docs": [
              "Content version. 0 = no content yet, set to 1 on first upload,",
              "incremented by 1 on every subsequent update."
            ],
            "type": "u32"
          },
          {
            "name": "nameLen",
            "docs": [
              "Length of the name stored in the `name` array."
            ],
            "type": "u16"
          },
          {
            "name": "authorLen",
            "docs": [
              "Length of the author stored in the `author` array."
            ],
            "type": "u16"
          },
          {
            "name": "name",
            "docs": [
              "Globally unique name (min 4 bytes, max 32 bytes)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "author",
            "docs": [
              "Display name of the skill author (max 64 bytes)."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
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
