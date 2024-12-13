export const Lock = ({
  isLoading,
  onClick,
  isFree,
}: {
  isLoading?: boolean;
  onClick?: () => void;
  isFree?: boolean;
}) => (
  <div
    zIndex="999"
    bg="rgba(0,0,0,0.9)"
    position="absolute"
    w="100%"
    h="100%"
    top="0"
    left="0"
    display="flex"
    alignItems="center"
    justifyContent="center"
    flexDir="column"
    gap={4}
  >
    <p fontSize={["xs", "sm", "lg", "lg"]} color="white">
      Esta lección esta bloqueada
    </p>
    <p
      fontSize={["xs", "sm", "lg", "lg"]}
      color="white"
      fontWeight="bold"
      pAlign="center"
    >
      {isFree
        ? "Inicia sesión para continuar viendo el curso gratuito"
        : " Compra el curso para ver el contenido completo"}
    </p>
    <img
      width={["32px", "40px", "80px", "80px"]}
      src="/icons/robot-tieso.png"
      alg="logo robot"
    />
    <button isLoading={isLoading} onClick={onClick}>
      {isFree ? "Inicia sesión" : "¡Comprar ya!"}
    </button>
  </div>
);
