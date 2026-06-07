export const responseMessages = {
  NOT_FOUND: (data: string, id: string) => `${data} with ID ${id} not found`,
  UPDATED_SUCCESSFULLY: (data: string) =>
    `The ${data} has been updated successfully`,
  CREATED_SUCCESSFULLY: (data: string) =>
    `The ${data} has been added successfully`,
  PAGE_LIMIT_REQUIRED: `Both page and limit are required`,
};

export default responseMessages;
