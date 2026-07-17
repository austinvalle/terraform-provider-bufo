import type { ServerUnaryCall, ServerWritableStream, sendUnaryData } from "@grpc/grpc-js";
import { encode, decode } from "@msgpack/msgpack";

type GrpcCallback = sendUnaryData<Record<string, unknown>>;
type UnaryCall = ServerUnaryCall<Record<string, unknown>, Record<string, unknown>>;
type StreamCall = ServerWritableStream<Record<string, unknown>, Record<string, unknown>>;

function emptyDiagnostics(): { diagnostics: unknown[] } {
  return { diagnostics: [] };
}

function encodeDynamicValue(values: Record<string, unknown>): Record<string, unknown> {
  const msgpackData = encode(values);
  return { msgpack: Buffer.from(msgpackData), json: Buffer.alloc(0) };
}

function deterministicId(name: string): string {
  let hash = 0;
  const str = `bufo:${name}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `bufo-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

function hasBytesLength(val: unknown): val is { length: number } {
  return val != null && typeof val === "object" && "length" in val && (val as { length: number }).length > 0;
}

function decodeDynamicValue(dynamicValue: Record<string, unknown>): Record<string, unknown> {
  if (!dynamicValue) return {};
  try {
    const msgpack = dynamicValue.msgpack as Uint8Array | undefined;
    if (msgpack && hasBytesLength(msgpack)) {
      const result = decode(new Uint8Array(msgpack));
      if (result && typeof result === "object") {
        return result as Record<string, unknown>;
      }
    }
    const json = dynamicValue.json as Uint8Array | undefined;
    if (json && hasBytesLength(json)) {
      return JSON.parse(new TextDecoder().decode(json));
    }
  } catch (e) {
    console.error("[decodeDynamicValue] error:", e);
  }
  return {};
}

export const providerMethods = {
  // === Information & Discovery ===

  getMetadata(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      server_capabilities: {},
      diagnostics: [],
      resources: [],
      data_sources: [],
      functions: [],
      ephemeral_resources: [],
      list_resources: [],
      state_stores: [],
      actions: [],
    });
  },

  getProviderSchema(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      provider: {
        version: 0,
        block: {
          version: 0,
          attributes: [],
          block_types: [],
        },
      },
      resource_schemas: {
        bufo: {
          version: 0,
          block: {
            version: 0,
            attributes: [
              {
                name: "id",
                type: Buffer.from(JSON.stringify("string")),
                description: "",
                required: false,
                optional: false,
                computed: true,
                sensitive: false,
                description_kind: "PLAIN",
                deprecated: false,
                write_only: false,
                deprecation_message: "",
                nested_type: null,
              },
              {
                name: "name",
                type: Buffer.from(JSON.stringify("string")),
                description: "",
                required: true,
                optional: false,
                computed: false,
                sensitive: false,
                description_kind: "PLAIN",
                deprecated: false,
                write_only: false,
                deprecation_message: "",
                nested_type: null,
              },
            ],
            block_types: [],
          },
        },
      },
      data_source_schemas: {},
      diagnostics: [
        {
          severity: "WARNING",
          summary: "Bufo Provider",
          detail: "This provider is a skeleton built with Deno + TypeScript. No resources are fully implemented yet.",
        },
      ],
      server_capabilities: {
        plan_destroy: true,
      },
      functions: {},
      ephemeral_resource_schemas: {},
      list_resource_schemas: {},
      state_store_schemas: {},
      action_schemas: {},
    });
  },

  getResourceIdentitySchemas(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      identity_schemas: {},
      diagnostics: [],
    });
  },

  validateProviderConfig(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      diagnostics: [
        {
          severity: "WARNING",
          summary: "Bufo Provider",
          detail: "This provider is a skeleton built with Deno + TypeScript. No resources are implemented yet.",
        },
      ],
    });
  },

  validateResourceConfig(call: UnaryCall, callback: GrpcCallback): void {
    const typeName = (call.request as Record<string, unknown>).type_name as string;
    if (typeName === "bufo") {
      callback(null, {
        diagnostics: [
          {
            severity: "WARNING",
            summary: "Bufo Resource",
            detail: "The bufo resource is a demo placeholder. No real infrastructure will be managed.",
          },
        ],
      });
    } else {
      callback(null, emptyDiagnostics());
    }
  },

  validateDataResourceConfig(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, emptyDiagnostics());
  },

  upgradeResourceState(call: UnaryCall, callback: GrpcCallback): void {
    const req = call.request as Record<string, unknown>;
    const rawState = req.raw_state as Record<string, unknown> | undefined;

    let values: Record<string, unknown> = {};

    if (rawState) {
      const jsonBytes = rawState.json as Uint8Array | undefined;
      if (jsonBytes && jsonBytes.length > 0) {
        try {
          values = JSON.parse(new TextDecoder().decode(jsonBytes));
        } catch (e) {
          console.error("[upgradeResourceState] error:", e);
        }
      }
    }

    callback(null, {
      upgraded_state: encodeDynamicValue(values),
      diagnostics: [],
    });
  },

  upgradeResourceIdentity(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      upgraded_identity: {},
      diagnostics: [],
    });
  },

  // === One-Time Initialization ===

  configureProvider(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, emptyDiagnostics());
  },

  // === Managed Resource Lifecycle ===

  readResource(call: UnaryCall, callback: GrpcCallback): void {
    const req = call.request as Record<string, unknown>;

    callback(null, {
      new_state: req.current_state,
      diagnostics: [],
    });
  },

  planResourceChange(call: UnaryCall, callback: GrpcCallback): void {
    const req = call.request as Record<string, unknown>;
    const typeName = req.type_name as string;

    const proposed = req.proposed_new_state as Record<string, unknown> | undefined;
    const prior = req.prior_state as Record<string, unknown> | undefined;

    if (typeName === "bufo") {
      const proposedValues = decodeDynamicValue(proposed || {});
      const priorValues = decodeDynamicValue(prior || {});

      const isDestroy = Object.keys(proposedValues).length === 0 && Object.keys(priorValues).length > 0;

      if (isDestroy) {
        callback(null, {
          planned_state: {},
          requires_replace: [],
          planned_private: new Uint8Array(),
          diagnostics: [],
        });
      } else {
        if (!proposedValues.id && proposedValues.name) {
          proposedValues.id = deterministicId(proposedValues.name as string);
        }

        callback(null, {
          planned_state: encodeDynamicValue(proposedValues),
          requires_replace: [],
          planned_private: new Uint8Array(),
          diagnostics: [],
        });
      }
    } else {
      callback(null, {
        planned_state: {},
        requires_replace: [],
        planned_private: new Uint8Array(),
        diagnostics: [],
      });
    }
  },

  applyResourceChange(call: UnaryCall, callback: GrpcCallback): void {
    const req = call.request as Record<string, unknown>;
    const typeName = req.type_name as string;

    const planned = req.planned_state as Record<string, unknown> | undefined;
    const prior = req.prior_state as Record<string, unknown> | undefined;

    if (typeName === "bufo") {
      const plannedValues = decodeDynamicValue(planned || {});
      const priorValues = decodeDynamicValue(prior || {});
      const isDestroy = Object.keys(plannedValues).length === 0 && Object.keys(priorValues).length > 0;

      callback(null, {
        new_state: isDestroy ? {} : encodeDynamicValue(plannedValues),
        diagnostics: [],
      });
    } else {
      callback(null, {
        new_state: {},
        diagnostics: [],
      });
    }
  },

  importResourceState(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      imported_resources: [],
      diagnostics: [],
    });
  },

  moveResourceState(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      target_state: {},
      diagnostics: [],
    });
  },

  readDataSource(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      state: {},
      diagnostics: [],
    });
  },

  generateResourceConfig(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      config: {},
      diagnostics: [],
    });
  },

  // === Ephemeral Resource Lifecycle ===

  validateEphemeralResourceConfig(
    _call: UnaryCall,
    callback: GrpcCallback,
  ): void {
    callback(null, emptyDiagnostics());
  },

  openEphemeralResource(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      diagnostics: [],
    });
  },

  renewEphemeralResource(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      diagnostics: [],
    });
  },

  closeEphemeralResource(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, emptyDiagnostics());
  },

  // === List Resources ===

  listResource(call: StreamCall): void {
    call.end();
  },

  validateListResourceConfig(
    _call: UnaryCall,
    callback: GrpcCallback,
  ): void {
    callback(null, emptyDiagnostics());
  },

  // === Functions ===

  getFunctions(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      functions: {},
      diagnostics: [],
    });
  },

  callFunction(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      diagnostics: [],
    });
  },

  // === Actions Lifecycle ===

  validateActionConfig(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, emptyDiagnostics());
  },

  planAction(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, emptyDiagnostics());
  },

  invokeAction(call: StreamCall): void {
    call.end();
  },

  // === State Store ===

  validateStateStoreConfig(
    _call: UnaryCall,
    callback: GrpcCallback,
  ): void {
    callback(null, emptyDiagnostics());
  },

  configureStateStore(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      diagnostics: [],
      capabilities: {},
    });
  },

  readStateBytes(call: StreamCall): void {
    call.end();
  },

  writeStateBytes(
    _call: ServerUnaryCall<unknown, unknown>,
    callback: GrpcCallback,
  ): void {
    callback(null, emptyDiagnostics());
  },

  lockState(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      lock_id: "",
      diagnostics: [],
    });
  },

  unlockState(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, emptyDiagnostics());
  },

  getStates(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, {
      state_ids: [],
      diagnostics: [],
    });
  },

  deleteState(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, emptyDiagnostics());
  },

  // === Graceful Shutdown ===

  stopProvider(_call: UnaryCall, callback: GrpcCallback): void {
    callback(null, { error: "" });
  },
};
