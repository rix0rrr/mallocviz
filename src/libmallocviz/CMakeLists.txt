include_directories(${CMAKE_CURRENT_SOURCE_DIR}/..)

add_library(mallocviz SHARED mallocviz.cpp)

target_link_libraries(mallocviz dl)
