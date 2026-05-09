import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "./imageUploadService";

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock("../lib/apiClient", () => ({
  default: {
    post: mockPost,
  },
}));

describe("imageUploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads an image and returns its Cloudinary URL", async () => {
    const file = new File(["image-bytes"], "logo.png", { type: "image/png" });
    mockPost.mockResolvedValue({
      data: {
        publicId: "trevo/logo",
        url: "https://res.cloudinary.com/demo/image/upload/logo.png",
      },
    });

    const url = await uploadImage(file);

    expect(url).toBe("https://res.cloudinary.com/demo/image/upload/logo.png");
    expect(mockPost).toHaveBeenCalledWith(
      "/uploads/images",
      expect.any(FormData),
      expect.objectContaining({
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
    );
  });

  it("reports upload progress as a percentage", async () => {
    const file = new File(["image-bytes"], "banner.webp", { type: "image/webp" });
    const onProgress = vi.fn();

    mockPost.mockImplementation((_url, _formData, config) => {
      config.onUploadProgress({ loaded: 24, total: 80 });
      return Promise.resolve({
        data: {
          publicId: "trevo/banner",
          url: "https://res.cloudinary.com/demo/image/upload/banner.webp",
        },
      });
    });

    await uploadImage(file, onProgress);

    expect(onProgress).toHaveBeenCalledWith(30);
  });
});
