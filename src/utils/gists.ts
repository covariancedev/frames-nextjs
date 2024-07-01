const fidsFile = {
	id: `${process.env.GISTS_ID}`,
	name: `${process.env.GISTS_NAME}`,
};

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
