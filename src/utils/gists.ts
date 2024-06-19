import config from "./config";
const { fidsFile } = config;

export const fetchFidsFromGists = async () => {
  const response = await fetch(`https://api.github.com/gists/${fidsFile.id}`, {
    cache: "no-store",
  });
  const json = await response.json();
  const fileKeys = Object.keys(json.files);
  if (fileKeys.length !== 1) {
    console.error(`fetchFids >> Invalid file keys: ${fileKeys}`);
    return [];
  }
  const data = json.files[fileKeys[0]];
  if (data.type !== "text/plain") {
    console.error(`fetchFids >> Invalid file type: ${data.type}`);
    return [];
  }
  const content = data.content as string;
  const fids = content.split("\n").map((line) => Number.parseInt(line, 10));

  console.log(`fetchFidsFromGists >> Fetched: ${fids.join(", ")}`);
  return fids;
};

export async function updateFidsToGists({
  old,
  fids,
}: {
  old: number[];
  fids: number[];
}) {
  const ids =
    !fids.length || fids.filter((fid) => fid === 0).length ? old : fids;
  const content = Array.from(new Set([7589, ...ids]));

  console.log(`updateFidsToGists >> Updating: ${content.join(", ")}`);

  const response = await fetch(`https://api.github.com/gists/${fidsFile.id}`, {
    method: "PATCH",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GISTS_API_KEY}`,
    },
    body: JSON.stringify({
      files: {
        [fidsFile.name]: {
          content: content.join("\n"),
        },
      },
    }),
  });

  if (!response.ok) {
    console.error("updateFidsToGists >> Failed", response.statusText);

    throw new Error(`Failed to update gists: ${response.statusText}`);
  }
  const json = await response.json();
  const fileKeys = Object.keys(json.files);
  const data = json.files[fileKeys[0]] as {
    content: string;
  };
  const freshIds = data.content
    .split("\n")
    .map((line) => Number.parseInt(line, 10));

  return freshIds;
}
