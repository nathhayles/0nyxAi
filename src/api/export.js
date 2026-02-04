export async function exportProject() {
  // MVP stub: simulate render delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        url: "/exports/sample.mp4"
      });
    }, 1500);
  });
}
