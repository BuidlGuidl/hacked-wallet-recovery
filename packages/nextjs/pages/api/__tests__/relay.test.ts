import handler from "../relay";
import { FlashbotsBundleProvider, RelayResponseError } from "@flashbots/ethers-provider-bundle";
import { ethers } from "ethers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as chains from "wagmi/chains";

// Mock environment variables
vi.stubEnv("NEXT_PUBLIC_ALCHEMY_API_KEY", "test-api-key");

// Mock external dependencies
vi.mock("@flashbots/ethers-provider-bundle", () => {
  return {
    FlashbotsBundleProvider: {
      create: vi.fn(),
    },
  };
});

vi.mock("ethers", () => {
  return {
    ethers: {
      providers: {
        JsonRpcProvider: vi.fn(),
      },
      Wallet: {
        createRandom: vi.fn().mockReturnValue({}),
      },
    },
  };
});

describe("Relay API Endpoint", () => {
  let mockReq: any;
  let mockRes: any;
  let mockProvider: any;
  let mockFlashbotsProvider: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock response object
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Mock request object with default values
    mockReq = {
      body: {
        txs: ["0x123..."], // Example signed transaction
      },
      headers: {
        "x-network-id": chains.mainnet.id.toString(),
      },
      query: {},
    };

    // Mock provider
    mockProvider = {
      getBlockNumber: vi.fn().mockResolvedValue(100),
    };
    (ethers.providers.JsonRpcProvider as any).mockImplementation(() => {
      return mockProvider;
    });

    // Mock Flashbots provider
    mockFlashbotsProvider = {
      sendRawBundle: vi.fn(),
      simulate: vi.fn(),
    };
    (FlashbotsBundleProvider.create as any).mockResolvedValue(mockFlashbotsProvider);
  });

  describe("Request Validation", () => {
    it("should reject empty requests", async () => {
      mockReq.body = null;
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ reason: "Bad bundle" });
    });

    it("should reject requests with empty transaction array", async () => {
      mockReq.body = { txs: [] };
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ reason: "Bad bundle" });
    });
  });

  describe("Network Configuration", () => {
    it("should handle mainnet configuration", async () => {
      mockReq.headers["x-network-id"] = chains.mainnet.id.toString();
      mockFlashbotsProvider.sendRawBundle.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(0),
        simulate: vi.fn().mockResolvedValue({}),
      });

      await handler(mockReq, mockRes);
      expect(FlashbotsBundleProvider.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.stringContaining("relay.flashbots"), // Check if using mainnet relay URL
        undefined,
      );
    });

    it("should handle sepolia configuration", async () => {
      mockReq.headers["x-network-id"] = chains.sepolia.id.toString();
      mockFlashbotsProvider.sendRawBundle.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(0),
        simulate: vi.fn().mockResolvedValue({}),
      });

      await handler(mockReq, mockRes);
      expect(FlashbotsBundleProvider.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.stringContaining("sepolia"), // Check if using sepolia relay URL
        "sepolia",
      );
    });
  });

  describe("Bundle Processing", () => {
    it("should handle successful bundle inclusion", async () => {
      const simulationResult = { someData: "success" };
      mockFlashbotsProvider.sendRawBundle.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(0), // BundleIncluded
        simulate: vi.fn().mockResolvedValue(simulationResult),
      });
      mockFlashbotsProvider.simulate.mockResolvedValue(simulationResult);

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(203);
      expect(mockRes.json).toHaveBeenCalledWith({
        response: expect.stringContaining("successfully included"),
        success: true,
        simulationResult,
      });
    });

    it("should handle block passed without inclusion", async () => {
      const simulationResult = { someData: "simulation" };
      mockFlashbotsProvider.sendRawBundle.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(1), // BlockPassedWithoutInclusion
        simulate: vi.fn().mockResolvedValue(simulationResult),
      });

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(203);
      expect(mockRes.json).toHaveBeenCalledWith({
        response: "BlockPassedWithoutInclusion.",
        success: false,
        simulationResult,
      });
    });

    it("should handle account nonce too high", async () => {
      const simulationResult = { someData: "simulation" };
      mockFlashbotsProvider.sendRawBundle.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(2), // AccountNonceTooHigh
        simulate: vi.fn().mockResolvedValue(simulationResult),
      });

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(203);
      expect(mockRes.json).toHaveBeenCalledWith({
        response: expect.stringContaining("nonce is too high"),
        success: false,
        simulationResult,
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle relay response errors", async () => {
      const errorResponse: RelayResponseError = {
        error: { message: "Simulation failed", code: 123 },
      };
      mockFlashbotsProvider.sendRawBundle.mockResolvedValue(errorResponse);

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(203);
      expect(mockRes.json).toHaveBeenCalledWith({
        response: expect.stringContaining("Simulation failed"),
        success: false,
      });
    });

    it("should handle simulation errors", async () => {
      mockFlashbotsProvider.sendRawBundle.mockResolvedValue({
        wait: vi.fn(),
        simulate: vi.fn(),
      });
      mockFlashbotsProvider.simulate.mockResolvedValue({
        error: { message: "Simulation error", code: 123 },
      });

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(203);
      expect(mockRes.json).toHaveBeenCalledWith({
        response: expect.stringContaining("Simulation error"),
        success: false,
      });
    });
  });
});
