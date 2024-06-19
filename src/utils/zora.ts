import { init, fetchQuery } from "@airstack/frog";
// init(process.env.AIRSTACK_API_KEY ?? "");

export async function getCollectionAllowList(fid: number | string) {
  console.log(`getCollectionAllowList >> fid: ${fid}`);

  const query = /* GraphQL */ `
    query GetFarcasterPowerUsers(
      $tokenAddress: Address
      $tokenIds: [String!]
      $fid: Identity
    ) {
      TokenBalances(
        input: {
          filter: {
            tokenAddress: { _eq: $tokenAddress }
            tokenId: { _in: $tokenIds }
            owner: { _eq: $fid }
          }
          blockchain: base
        }
      ) {
        TokenBalance {
          tokenId
        }
      }
    }
  `;

  // createAll
  const response = await fetchQuery(query, {
    tokenAddress: "0xe2fb0e28d391ca747481b3f0dff906644416fac9",
    tokenIds: ["2", "4", "5"],
    fid: `fc_fid:${fid}`,
  });
  if (response.error) {
    console.error(`getCollectionAllowList >> errors: ${fid}`, response.error);
    return [];
  }
  const data = response.data as {
    TokenBalances: {
      TokenBalance:
        | {
            tokenId: string;
          }[]
        | null;
    };
  };

  console.log(`getCollectionAllowList >> data: ${fid}`, data.TokenBalances);

  return data.TokenBalances.TokenBalance ?? [];
}
