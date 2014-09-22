add_executable(tester tester.cpp)

target_link_libraries(tester mallocviz)

configure_file(run-instrumented ${CMAKE_CURRENT_BINARY_DIR}/run-instrumented COPYONLY)

if(CMAKE_COMPILER_IS_GNUCC)
     add_definitions(-std=c++0x)
endif(CMAKE_COMPILER_IS_GNUCC)
