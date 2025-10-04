def boxdrawer(start_x, start_y, height, source, destination, mode, buffer, draw):
    import cv2
    import numpy as np
    k = 0
    white_rows = 0

    if mode == 'starting_left':
            while white_rows < buffer:
                    row_pixel = source[start_y: start_y + height, start_x + k]     
                    black_pixel = np.sum(row_pixel < 100)           

                    if black_pixel > 0:
                            k += 1
                            white_rows = 0
                    else:
                            white_rows += 1
                            k += 1
            
            if draw:
                    cv2.rectangle(destination, (start_x,start_y), (start_x+k-4, start_y+height), (0, 0, 255), 1)
                    

    


    elif mode == 'starting_right':
            while white_rows < buffer:
                    row_pixel = source[start_y: start_y + height, start_x - k]     
                    black_pixel = np.sum(row_pixel == 0)           

                    if black_pixel > 0:
                            k += 1
                            white_rows = 0
                    else:
                            white_rows += 1
                            k += 1

            if draw:
                    cv2.rectangle(destination, (start_x-k+4, start_y), (start_x, start_y+height), (0, 0, 255), 1)


    return k 