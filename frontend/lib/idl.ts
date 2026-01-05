export const IDL = {
  "address": "81YhjpVcTKih7aR8ruyHW9m5cmD6SskiJtwGj4sGFGgy",
  "metadata": {
    "name": "timelock_wallet",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "get_timelock_info",
      "docs": [
        "Get timelock information (read-only)"
      ],
      "discriminator": [
        232,
        144,
        236,
        222,
        91,
        133,
        66,
        77
      ],
      "accounts": [
        {
          "name": "timelock_account"
        }
      ],
      "args": [],
      "returns": {
        "defined": {
          "name": "TimelockInfo"
        }
      }
    },
    {
      "name": "initialize_lock",
      "docs": [
        "Initialize a SOL timelock"
      ],
      "discriminator": [
        182,
        214,
        195,
        105,
        58,
        73,
        81,
        124
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "timelock_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  109,
                  101,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "unlock_timestamp"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "unlock_timestamp",
          "type": "i64"
        },
        {
          "name": "recipient",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "initialize_token_lock",
      "docs": [
        "Initialize a token timelock (USDC, etc.)"
      ],
      "discriminator": [
        87,
        49,
        15,
        230,
        96,
        231,
        59,
        128
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "timelock_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  109,
                  101,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "token_mint"
        },
        {
          "name": "creator_token_account",
          "writable": true
        },
        {
          "name": "timelock_token_account",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "unlock_timestamp",
          "type": "i64"
        },
        {
          "name": "recipient",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "docs": [
        "Withdraw SOL from timelock"
      ],
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
          "name": "recipient",
          "writable": true,
          "signer": true
        },
        {
          "name": "timelock_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  109,
                  101,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "timelock_account.creator",
                "account": "TimelockAccount"
              },
              {
                "kind": "account",
                "path": "timelock_account.unlock_timestamp",
                "account": "TimelockAccount"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "withdraw_token",
      "docs": [
        "Withdraw tokens from timelock"
      ],
      "discriminator": [
        136,
        235,
        181,
        5,
        101,
        109,
        57,
        81
      ],
      "accounts": [
        {
          "name": "recipient",
          "writable": true,
          "signer": true
        },
        {
          "name": "timelock_account",
          "writable": true
        },
        {
          "name": "timelock_token_account",
          "writable": true
        },
        {
          "name": "recipient_token_account",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "TimelockAccount",
      "discriminator": [
        95,
        235,
        115,
        186,
        0,
        160,
        22,
        33
      ]
    }
  ],
  "events": [
    {
      "name": "FundsWithdrawn",
      "discriminator": [
        56,
        130,
        230,
        154,
        35,
        92,
        11,
        118
      ]
    },
    {
      "name": "TimelockCreated",
      "discriminator": [
        139,
        109,
        102,
        198,
        148,
        128,
        43,
        152
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidUnlockTime",
      "msg": "Unlock time must be in the future"
    },
    {
      "code": 6001,
      "name": "InvalidAmount",
      "msg": "Amount must be greater than 0"
    },
    {
      "code": 6002,
      "name": "MinimumAmount",
      "msg": "Minimum amount is 0.001 SOL (1,000,000 lamports)"
    },
    {
      "code": 6003,
      "name": "StillLocked",
      "msg": "Funds are still locked"
    },
    {
      "code": 6004,
      "name": "AlreadyWithdrawn",
      "msg": "Funds have already been withdrawn"
    },
    {
      "code": 6005,
      "name": "UnauthorizedRecipient",
      "msg": "Only the designated recipient can withdraw"
    },
    {
      "code": 6006,
      "name": "UseTokenWithdraw",
      "msg": "This is a token account, use withdraw_token instruction"
    },
    {
      "code": 6007,
      "name": "NotTokenAccount",
      "msg": "This is not a token timelock account"
    },
    {
      "code": 6008,
      "name": "InvalidTokenAccount",
      "msg": "Invalid token account"
    }
  ],
  "types": [
    {
      "name": "FundsWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timelock_account",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "TimelockAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "unlock_timestamp",
            "type": "i64"
          },
          {
            "name": "created_at",
            "type": "i64"
          },
          {
            "name": "is_withdrawn",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "token_mint",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "TimelockCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timelock_account",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "unlock_timestamp",
            "type": "i64"
          },
          {
            "name": "token_mint",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "TimelockInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "unlock_timestamp",
            "type": "i64"
          },
          {
            "name": "created_at",
            "type": "i64"
          },
          {
            "name": "is_withdrawn",
            "type": "bool"
          },
          {
            "name": "is_unlocked",
            "type": "bool"
          },
          {
            "name": "time_remaining",
            "type": "i64"
          },
          {
            "name": "token_mint",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    }
  ]
}