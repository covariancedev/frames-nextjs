/** @jsxImportSource @airstack/frog/jsx */
import { Box, Text, VStack } from "@/utils/ui";

export const ErrorImage = ({
    title,
    subtitle,
}: {
    title: string;
    subtitle?: string;
}) => {
    return (
        <Box
            backgroundColor="blue700"
            width='100%'
            backgroundSize='1200px 630px'
            backgroundRepeat='no-repeat'
            height='100%'
            padding={'32'}
            alignVertical="center"
        >

            <VStack
                gap='10'
                paddingLeft='24'
                alignHorizontal="center"

            >
                <Text size='64'>😥</Text>
                <Text size={'24'} color={'white'}>{title}</Text>
                {subtitle ? <Text size='16' color={'white'}>{subtitle}</Text> : <></>}
            </VStack>
        </Box>
    );
};